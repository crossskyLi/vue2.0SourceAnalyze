/* @flow */

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError
} from '../util/index'

import {traverse} from './traverse'
import {queueWatcher} from './scheduler'
import Dep, {pushTarget, popTarget} from './dep'

import type {SimpleSet} from '../util/index'

let uid = 0

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 *
 * Watcher 创建时候,会调用this.get ,里面会执行根据expOrFn 解析出来的getter ,
 * 在这个getter中,渲染页面或者获取某个数据的值,会调用相关data 的 getter ,来建立数据的双向绑定
 *
 * 当相关的数据改变的时候,会调用 watcher 的 update 方法,进而调用run 方法,
 * 可以看出run 中还会调用this.get 来获取修改后的value值
 *
 * Watcher 的两种主要用途:
 * 1. 更新模版;
 * 2. 监听某个值的变化
 *
 * 通过创建Watcher 对象,然后调用updateComponent 来跟新渲染模版
 * vm._watcher = new Watcher(vm, updateComponent, noop);
 *
 * 创建Watcher 会调用this.get ,也就是这里的updateComponent
 * 在render 的过程中,会调用data的 getter 方法,以此来建立数据的双向绑定,
 * 当数据改变时,会宠幸出发updateComponent 。
 * 这里this.get 返回值是undefined ,所以主要是用于渲染模版
 *
 * -- 监听数据 --
 * computed / watch ,即监听数据的变化来执行响应操作
 * 此时,this.get 返回的是要监听数据的值。
 * 初始化过程中,调用this.get 会拿到初始值保存为 this.value ,监听的数据改变后,
 * 会在此调用this.get 并拿到修改后的值, 将旧值和新值传给cb 并执行相应的回调
 *
 * -- queueWatcher -- (queue 队列)
 * 函数名可以知道,它把当前的 watcher 添加到一个队列中,
 * Vue 中页面更新是异步的,所以一系列的数据变化,会在之后的某一时刻统一更新,
 *
 */
export default class Watcher {
  vm: Component;
  expression: string;
  cb: Function; // 重要参数
  id: number;
  deep: boolean;
  user: boolean;
  lazy: boolean;
  sync: boolean;
  dirty: boolean;
  active: boolean;
  deps: Array<Dep>;
  newDeps: Array<Dep>;
  depIds: SimpleSet;
  newDepIds: SimpleSet;
  getter: Function;
  value: any;

  constructor(vm: Component,
              expOrFn: string | Function, // 重要参数
              cb: Function,
              options?: ?Object,
              isRenderWatcher?: boolean) {
    this.vm = vm
    if (isRenderWatcher) {
      vm._watcher = this
    }
    vm._watchers.push(this)
    // options

    if (options) {
      /**
       * 有选项,两次取反,获取Boolean
       * */
      /**
       * 在computed属性中创建的Watcher会传入true。
       * */
      this.deep = !!options.deep
      this.user = !!options.user
      this.lazy = !!options.lazy
      this.sync = !!options.sync
    } else {
      /**
       * 这里四个参数默认为false
       * */
      this.deep = this.user = this.lazy = this.sync = false
    }
    this.cb = cb
    this.id = ++uid // uid for batching
    this.active = true
    this.dirty = this.lazy // for lazy watchers
    this.deps = []
    this.newDeps = []
    this.depIds = new Set()
    this.newDepIds = new Set()
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    // parse expression for getter
    if (typeof expOrFn === 'function') {
      /**
       * expOrFn 是方法, expOrFn 也就是 updateComponent 赋值给this.getter
       * */
      this.getter = expOrFn
    } else {
      /**
       *
       * */
      this.getter = parsePath(expOrFn)
      if (!this.getter) {
        this.getter = function () {
        }
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }
    /**
     * 调用this.getter ,updateComponent 方法会被调用,可以沿着updateComponent一路找
     * */
    this.value = this.lazy
      ? undefined
      : this.get()
  }

  /**
   * Evaluate the getter, and re-collect dependencies.
   */
  get() {
    pushTarget(this)
    let value
    const vm = this.vm
    try {
      value = this.getter.call(vm, vm)
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      if (this.deep) {
        traverse(value)
      }
      popTarget()
      this.cleanupDeps()
    }
    return value
  }

  /**
   * Add a dependency to this directive.
   */
  addDep(dep: Dep) {
    const id = dep.id
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      if (!this.depIds.has(id)) {
        dep.addSub(this)
      }
    }
  }

  /**
   * Clean up for dependency collection.
   */
  cleanupDeps() {
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this)
      }
    }
    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()
    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   *
   */
  update() {
    /* istanbul ignore else */
    if (this.lazy) {
      this.dirty = true
    } else if (this.sync) {
      /**
       * 在渲染模版过程中,调用数据对象的getter 时,建立两者之间的关系
       * 同一个时刻只有一个watcher 处于激活状态,把当前watcher 绑定在Dep.target(方便在Observer内获取)
       * 回调结束摧毁Dep.target
       * */
      this.run()
    } else {
      /**
       * 队列化Watch
       * */
      queueWatcher(this)
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */
  run() {
    if (this.active) {
      const value = this.get()
      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        isObject(value) ||
        this.deep
      ) {
        // set new value
        const oldValue = this.value
        this.value = value
        /**
         * 把当前watcher 绑定在Dep.target(方便在Observer内获取)
         * 回调结束摧毁Dep.target
         * */
        if (this.user) {
          try {
            this.cb.call(this.vm, value, oldValue)
          } catch (e) {
            handleError(e, this.vm, `callback for watcher "${this.expression}"`)
          }
        } else {
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */
  evaluate() {
    this.value = this.get()
    this.dirty = false
  }

  /**
   * Depend on all deps collected by this watcher.
   */
  depend() {
    let i = this.deps.length
    while (i--) {
      this.deps[i].depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   * 移除订阅器
   */
  teardown() {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this)
      }
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
}

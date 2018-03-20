/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0

export function initMixin (Vue: Class<Component>) {
  Vue.prototype._init = function (options?: Object) {
    const vm: Component = this
    // a uid
    // 给当前vm 添加一个唯一的_uid
    vm._uid = uid++

    let startTag, endTag
    /* istanbul ignore if */
    // 性能统计相关
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // a flag to avoid this being observed
    // _isVue设为true (监听对象变化时用于过滤vm)。

    vm._isVue = true
    // merge options
    if (options && options._isComponent) { // _isComponent 是内部创建子组件时,才会添加true的属性
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      // 内部使用Vnode部分使用
      initInternalComponent(vm, options)
    } else {
      // 不是子组件,直接走这里的方法
      // mergeOptions合并两个对象,不同于Object.assign 的简单合并,它还对数据进行一系列操作
      // 源码中多次用到
      // resolveConstructorOptions 方法在Vue.extend 中做解释
      // 它的作用是合并构造器以及构造器父级上定义的options
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    /**
     * 合并后的vm.$option
     * vm.$option = {
                components: {
                  KeepAlive,
                  Transition,
                  TransitionGroup
                },
                directives: {
                  model,
                  show
                },
                filters: {},
                _base: Vue,
                el: '#app',
                data: function mergedInstanceDataFn(){}
          }
     * */
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm
    /**
    * 主要就是给vm对象添加了$parent、$root、$children属性，以及一些其它的生命周期相关的标识。
    * */
    initLifecycle(vm)
    /**
     * 该方法初始化事件相关的属性，_parentListeners是父组件中绑定在自定义标签上的事件，供子组件处理。
     * */
    initEvents(vm)
    /**
     * 这里给vm添加了一些虚拟dom、slot等相关的属性和方法。
     * */
    initRender(vm)
    /**
     * 调用beforeCreate 钩子函数
     * */
    callHook(vm, 'beforeCreate')
    /**
     * initInjections(vm)和initProvide(vm)
     * 两个配套使用，用于将父组件_provided中定义的值，通过inject注入到子组件，且这些属性不会被观察
     * */
    /**
     * 在data和props生成前,处理注入
     * */
    initInjections(vm) // resolve injections before data/props
    /**
     * 添加 props、methods、data、computed、watch
     * 从这里开始就涉及到了Observer、Dep和Watcher，
     * 而且，这里对数据操作也比较多。
     * */
    initState(vm)
    /**
     *
     * */
    initProvide(vm) // resolve provide after data/props
    /**
     * 页面数据data绑定好
     * 进入 'create' 周期
     * */
    /**

     vm._uid = 0
     vm._isVue = true
     vm.$options = {
        components: {
          KeepAlive,
          Transition,
          TransitionGroup
        },
      directives: {
        model,
        show
      },
      filters: {},
      _base: Vue,
        el: '#app',
        data: function mergedInstanceDataFn(){}
      }
     vm._renderProxy = vm
     vm._self = vm

     // initLifecycle
     vm.$parent = parent
     vm.$root = parent ? parent.$root : vm

     vm.$children = []
     vm.$refs = {}

     vm._watcher = null
     vm._inactive = null
     vm._directInactive = false
     vm._isMounted = false
     vm._isDestroyed = false
     vm._isBeingDestroyed = false

     // initEvents
     vm._events = Object.create(null)
     vm._hasHookEvent = false

     // initRender
     vm.$vnode = null
     vm._vnode = null
     vm._staticTrees = null
     vm.$slots = resolveSlots(vm.$options._renderChildren, renderContext)
     vm.$scopedSlots = emptyObject

     vm._c = (a, b, c, d) => createElement(vm, a, b, c, d, false)

     vm.$createElement = (a, b, c, d) => createElement(vm, a, b, c, d, true)
     // 在 initState 中添加的属性
     vm._watchers = []
     vm._data
     vm.message
     * */
    callHook(vm, 'created')

    /* istanbul ignore if */
    // 性能相关
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}

export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode
  opts._parentElm = options._parentElm
  opts._refElm = options._refElm

  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

/**
 * 作用是合并构造器以及构造器父级上定义的options
 * */
export function resolveConstructorOptions (Ctor: Class<Component>) {
  // 这里的ctor 就是vm.constructor 也就是 Vue 对象, 在src/core/global-api/index文件中,
  // 给Vue 添加了全局的属性或方法
  let options = Ctor.options;
  // 打印出来
  // options = {
  //   components:{
  //     KeepAlive,
  //     Transition,
  //     TransitionGroup,
  //   },
  //   directive:{
  //     model,
  //     show,
  //   },
  //   filters:{},
  //   _base:Vue,
  // }
/**
 * Ctor.super是在调用Vue.extend时候,才会添加的属性,
 * */

  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super)
    const cachedSuperOptions = Ctor.superOptions
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      // superOptions
      /**
       * mergeOptions 是Vue中处理属性的合并策略的地方
       * */
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)

      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options
  const extended = Ctor.extendOptions
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = dedupe(latest[key], extended[key], sealed[key])
    }
  }
  return modified
}

function dedupe (latest, extended, sealed) {
  // compare latest and sealed to ensure lifecycle hooks won't be duplicated
  // between merges
  if (Array.isArray(latest)) {
    const res = []
    sealed = Array.isArray(sealed) ? sealed : [sealed]
    extended = Array.isArray(extended) ? extended : [extended]
    for (let i = 0; i < latest.length; i++) {
      // push original options and not sealed options to exclude duplicated options
      if (extended.indexOf(latest[i]) >= 0 || sealed.indexOf(latest[i]) < 0) {
        res.push(latest[i])
      }
    }
    return res
  } else {
    return latest
  }
}

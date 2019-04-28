/* @flow */
/**
 * 双向数据绑定,主要分为三个部分
 * 1. Observer ,这里的主要工作是递归地监听对象上的所有属性,在属性值改变的时候,触发相应的watcher
 * 2. Watcher , 观察者,当监听的数据修改的时候,执行相应的回调函数(Vue里面的更新模版内容)
 * 3. Dep , 订阅者,是连接Observer 和 Watcher的桥梁,每一个Observer 对应一个Dep ,
 *    它内部维护一个数组,保存与该Observer 相关的Watcher
 * */
/**
 * <div id="test"></div>
 <script type="text/javascript">
 var obj = {
      a: 1,
      b: 2,
      c: 3
    }
 Object.keys(obj).forEach(function(key){
      new Observer(obj, key, obj[key])
    });
 new Watcher(function(){
      document.querySelector("#test").innerHTML = obj.a;
    })
 </script>
 * */
/**
 * 假设是以上例子
 * 首先给obj的每个属性,都添加了getter 和 setter,
 * 创建一个 Watcher 对象,回调函数是使#test 的内容为obj.a 这里是 1 。
 * 修改 obj.a = 123; 对应的页面中显示内容变成123
 * Vue 中对数组做了处理,而且页面的更新是异步执行的,所以会有很多其他的处理
 *
 * Vue 的更新是生成render函数, 然后生成虚拟dom ,映射到页面上
 *
 *                      Trigger
 *                      re-render
 *   component  <------------------------------- Watcher < -----\
 *    Render                                      *             \
 *    Function                                   * *            \
 *      \                      ----------         \ Collect as  \ Notify
 *      \           Touch     \  data    \        \ Dependency  \
 *      \  render ----------->\  getter  \ --------             \
 *     * *                    \  setter  \ ----------------------
 *      *                      ----------
 *   Virtual DOM Tree
 *
 *   如上,Vue的更新是生成render函数,然后生成虚拟dom,映射到页面上,
 *   左侧的部分其实是我们 watcher 的回调,右下角的data 就是通过我们上面说的Observer 来添加getter 和 setter
 *   watcher 通过dep(dependency) 和data 联系在一起, 并出发 re-render
 *  */

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 */
export let shouldObserve: boolean = true

export function toggleObserving(value: boolean) {
  shouldObserve = value
}

/**
 * Observer class that is attached to each observed
 * object. Once attached, the observer converts the target
 * object's property keys into getter/setters that
 * collect dependencies and dispatch updates.
 */
export class Observer {
  value: any;
  dep: Dep;
  /**
   * 把该属性作为root $data 的vm 个数
   * */
  vmCount: number; // number of vms that has this object as root $data

  constructor(value: any) {
    this.value = value
    this.dep = new Dep()
    this.vmCount = 0
    /**
     * Object.defineProperty 调用 ,
     * 给value 添加 __ob__ 属性
     * 标识value有对应的Observer
     * 整体上value 分为对象和数组两种情况
     * */
    def(value, '__ob__', this)
    /**
     * 判断是不是数组,由于数组本身只引用一个地址
     * 所以对数组进行push,splice,sort 等操作,是无法监听的
     * 所以Vue中改写value 的__proto__ (如果有),
     * 或者在value 上重新定义这些方法,arguments 在环境支持 __proto__ 时是protoAugment, 不支持时是copyAugment
     * */
    if (Array.isArray(value)) {
      /**
       * 数组处理, augment在环境支持__proto__时是protoAugment，不支持时是copyAugment
       * */
      const augment = hasProto
        ? protoAugment
        : copyAugment
      augment(value, arrayMethods, arrayKeys)
      this.observeArray(value)
    } else {
      /**
       * 处理对象,该方法就是遍历对象,对每个值执行defineReactive
       * */
      this.walk(value)
    }
  }

  /**
   * Walk through each property and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   * 遍历,只对Object 生效,
   * 对每个值执行defineReactive
   * 给每个属性添加getter 和 setter
   */
  walk(obj: Object) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }

  /**
   * Observe a list of Array items.
   * 观察数组的每一项
   */
  observeArray(items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment an target Object or Array by intercepting
 * the prototype chain using __proto__
 *
 */
function protoAugment(target, src: Object, keys: any) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment an target Object or Array by defining
 * hidden properties.
 */
/**
 * copyAugment 中循环把 arrayMethods 上的arrayKeys 方法添加到value上
 * arrayMethods 其实是改写了数组方法的新对象,arrayKeys 是arrayMethods 中的方法列表
 * */
/* istanbul ignore next */
function copyAugment(target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 */

/**
 * observe 用于观察一个对象,返回与对象相关的Observer对象,
 * 如果没有则为value 创建一个对应的Observer
 *  defineReactive中调用该方法，其实就是为所有value为对象的值递归地观察。
 * */
export function observe(value: any, asRootData: ?boolean): Observer | void {
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  let ob: Observer | void
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__
  } else if (
    shouldObserve &&
    !isServerRendering() &&
    // isPlainObject 检测是否为严格的js对象
    (Array.isArray(value) || isPlainObject(value)) &&
    // 检测value 是否可扩展
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    ob = new Observer(value)
  }
  if (asRootData && ob) {
    ob.vmCount++
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 * defineReactive  这个方法具体是为obj 的key值添加修饰器的地方。
 * 它会为每个值创建一个dep ,如果用户为这个值传入getter 和setter ,则暂时保存
 *
 */
export function defineReactive(obj: Object,
                               key: string,
                               val: any,
                               customSetter?: ?Function,
                               shallow?: boolean) {
  const dep = new Dep()

  const property = Object.getOwnPropertyDescriptor(obj, key)
  /**
   * 当且仅当指定对象的属性描述不可以被改变或者属性不可以被删除时，为true。直接返回
   * */
  if (property && property.configurable === false) {
    return
  }

  // cater for pre-defined getter/setters
  /**
   * 满足预定的setter 和 getter
   * */
  const getter = property && property.get
  if (!getter && arguments.length === 2) {
    val = obj[key]
  }
  const setter = property && property.set

  /**
   * 在getter 中,把watcher 添加到dep中,
   * setter 中触发watcher 执行回调
   * */
  let childOb = !shallow && observe(val)
  /**
   * 通过 Object.defineProperty ,重新添加装饰。
   * 在getter 中,dep.depend 其实做了两件事:
   *    一、向Dep.target 内部的deps 添加dep;
   *    二、将Dep.target 添加到dep 内部的 subs (订阅),建立它们之间的联系
   * 在setter中,如果新旧值相同,直接返回, 不同则调用dep.notify 来更新与之相关的watcher
   * customSetter 在开发过程中,作为输出错误使用
   *
   * */
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter() {
      const value = getter ? getter.call(obj) : val
      if (Dep.target) {
        dep.depend()
        if (childOb) {
          childOb.dep.depend()
          if (Array.isArray(value)) {
            dependArray(value)
          }
        }
      }
      return value
    },
    set: function reactiveSetter(newVal) {
      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare */
      /**
       * 新值 ,旧值对比
       * */
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      /**
       * defineReactive中调用该方法，其实就是为所有value为对象的值递归地观察
       *  shallow (浅)
       * */
      childOb = !shallow && observe(newVal)
      /**
       * 触发watcher 执行回调
       * */
      dep.notify()
    }
  })
}


/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function set(target: Array<any> | Object, key: any, val: any): any {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  if (!ob) {
    target[key] = val
    return val
  }
  defineReactive(ob.value, key, val)
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del(target: Array<any> | Object, key: any) {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  if (!hasOwn(target, key)) {
    return
  }
  delete target[key]
  if (!ob) {
    return
  }
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray(value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}

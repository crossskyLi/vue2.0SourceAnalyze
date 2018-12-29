/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { defineComputed, proxy } from '../instance/state'
import { extend, mergeOptions, validateComponentName } from '../util/index'

export function initExtend(Vue: GlobalAPI) {
  /**
   * Each instance constructor, including Vue, has a unique
   * cid. This enables us to create wrapped "child
   * constructors" for prototypal inheritance and cache them.
   * 
   * 每个原型构造器都,包括vue ,都有一个唯一的cid,
   * 这使我们能够为原型继承创建封装的 子构造函数并缓存他们
   */
  Vue.cid = 0
  let cid = 1

  /**
   * Class inheritance
   */
  // 继承
  Vue.extend = function (extendOptions: Object): Function {
    extendOptions = extendOptions || {}
    const Super = this
    const SuperId = Super.cid
    const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {})
    if (cachedCtors[SuperId]) {
      return cachedCtors[SuperId]
    }

    const name = extendOptions.name || Super.options.name
    if (process.env.NODE_ENV !== 'production' && name) {
      validateComponentName(name) // 检查是否为有效的组件名
    }

    const Sub = function VueComponent(options) {
      this._init(options) // 调用原型 instance 的 _init 
    }
    Sub.prototype = Object.create(Super.prototype)
    Sub.prototype.constructor = Sub
    Sub.cid = cid++
    Sub.options = mergeOptions(
      Super.options,
      extendOptions
    )
    Sub['super'] = Super

    // For props and computed properties, we define the proxy getters on
    // the Vue instances at extension time, on the extended prototype. This
    // avoids Object.defineProperty calls for each instance created.
    if (Sub.options.props) {
      initProps(Sub) // 初始化props
    }
    if (Sub.options.computed) {
      initComputed(Sub) // 初始化 computed
    }

    // allow further extension/mixin/plugin usage
    Sub.extend = Super.extend
    Sub.mixin = Super.mixin
    Sub.use = Super.use

    // create asset registers, so extended classes
    // can have their private assets too.
    // 创建资源寄存器,使扩展类也可以拥有他们的私有寄存器
    ASSET_TYPES.forEach(function (type) {
      Sub[type] = Super[type]
    })
    // enable recursive self-lookup
    // 自我递归查找
    if (name) {
      Sub.options.components[name] = Sub
    }

    // keep a reference to the super options at extension time.
    // later at instantiation we can check if Super's options have
    // been updated.
    // 在扩展时,保留对 super 的引用,稍后在实例化时，
    // 我们可以检查Super的选项是否已经更新。
    // 父级options
    Sub.superOptions = Super.options
    // 扩展选项
    Sub.extendOptions = extendOptions
    // 自有选项
    Sub.sealedOptions = extend({}, Sub.options)

    // cache constructor
    // 缓存构造器
    cachedCtors[SuperId] = Sub
    return Sub
  }
}


// 初始化 props
function initProps(Comp) {
  const props = Comp.options.props
  for (const key in props) {
    proxy(Comp.prototype, `_props`, key)
  }
}

function initComputed(Comp) {
  const computed = Comp.options.computed
  for (const key in computed) {
    defineComputed(Comp.prototype, key, computed[key])
  }
}

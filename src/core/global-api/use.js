/* @flow */

import { toArray } from '../util/index'

export function initUse (Vue: GlobalAPI) {
  Vue.use = function (plugin: Function | Object) {
    // (this._installedPlugins || (this._installedPlugins = [])) 
    // 这个写法判断this._installedPlugins是否有,有的话返回 this._installedPlugins 
    // 目标应该是 数组
    // (this._installedPlugins = []) 把 this._installedPlugins 赋值为[], 并返回 [];
    
    const installedPlugins = (this._installedPlugins || (this._installedPlugins = []))
    if (installedPlugins.indexOf(plugin) > -1) {
      return this
    }

    // additional parameters
    const args = toArray(arguments, 1)
    args.unshift(this)
    if (typeof plugin.install === 'function') {
      plugin.install.apply(plugin, args)
    } else if (typeof plugin === 'function') {
      plugin.apply(null, args)
    }
    installedPlugins.push(plugin)
    return this
  }
}

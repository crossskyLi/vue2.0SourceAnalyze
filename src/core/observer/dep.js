/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'

let uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 * 一个dep是一个可观察到的，它可以有多个指令来订阅它。
 */
export default class Dep {
  static target: ?Watcher;
  id: number;
  subs: Array<Watcher>;

  constructor () {
    this.id = uid++
    /**
     * 内部一个存放watcher数组的subs
     * */
    this.subs = []
  }
  /**
   * addSub 用于向数组中添加watcher (getter时),
   * */
  addSub (sub: Watcher) {
    this.subs.push(sub)
  }

  /**
   * removeSub 是从数组中移除某一 watcher ,depend 是调用了watcher 的 addDep
   * */
  removeSub (sub: Watcher) {
    remove(this.subs, sub)
  }

  /**
   * 添加watcher 到dep中
   * */
  depend () {
    if (Dep.target) {
      Dep.target.addDep(this)
    }
  }
  /**
   * notify用于触发watcher的更新回调(setter时候)
   * */
  notify () {
    // stabilize the subscriber list first
    /**
     * 拷贝数组,稳定数组
     * */
    const subs = this.subs.slice()
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

// the current target watcher being evaluated.
// this is globally unique because there could be only one
// watcher being evaluated at any time.
Dep.target = null
const targetStack = []

export function pushTarget (_target: ?Watcher) {
  if (Dep.target) targetStack.push(Dep.target)
  Dep.target = _target
}

export function popTarget () {
  Dep.target = targetStack.pop()
}

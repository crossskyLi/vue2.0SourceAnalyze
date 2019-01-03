import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) { // 判断是否为 new 关键词创建
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  this._init(options)
}
// _init
// 先执行 ./init 中initMixin
initMixin(Vue)

// $set $delete $watch
stateMixin(Vue)
// $on $once $off $emit
eventsMixin(Vue)
// _update $forceUpdate $destroy
lifecycleMixin(Vue)
// $nextTick _render 以及多个内部调用的方法
renderMixin(Vue)

export default Vue

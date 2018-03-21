/* @flow */

import {
  isPreTag,
  mustUseProp,
  isReservedTag,
  getTagNamespace
} from '../util/index'

import modules from './modules/index'
import directives from './directives/index'
import { genStaticKeys } from 'shared/util'
import { isUnaryTag, canBeLeftOpenTag } from './util'

export const baseOptions: CompilerOptions = {
  expectHTML: true, // 是否期望HTML
  modules, // 包括klass 和style, 对模版中类和样式的解析
  directives, // 这里包括model (v-model)、html (v-html)、text (v-text) 三个指令
  isPreTag, // 是否是pre标签
  isUnaryTag, // 是否是单标签，比如img、input、iframe等
  mustUseProp, // 需要使用props绑定的属性，比如value、selected等。
  canBeLeftOpenTag, // 可以不闭合的标签 比如tr,td 等
  isReservedTag, // 是否是保留标签,html SVG标签
  getTagNamespace, // 获取命名空间,svg 和 math
  staticKeys: genStaticKeys(modules) // 静态关键词 ,包括staticClass , staticStyle
}

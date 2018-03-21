/* @flow */
/**
 * 从 options 中导入baseOptions ,主要保存解析模版时和平台相关的一些配置
 * 对应在src/platforms/weex/complier/index 中也有一份名称一样的配置
 *
 * */
import { baseOptions } from './options'
import { createCompiler } from 'compiler/index' // src/compiler/index

const { compile, compileToFunctions } = createCompiler(baseOptions)

export { compile, compileToFunctions }

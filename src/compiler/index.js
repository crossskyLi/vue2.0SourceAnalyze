/* @flow */

import {parse} from './parser/index'
import {optimize} from './optimizer'
import {generate} from './codegen/index'
import {createCompilerCreator} from './create-compiler'

// `createCompilerCreator` allows creating compilers that use alternative
// parser/optimizer/codegen, e.g the SSR optimizing compiler.
// Here we just export a default compiler using the default parts.
/**
 * compileToFunctions 中调用了compile ,compile
 *
 */
export const createCompiler = createCompilerCreator(function baseCompile(template: string,
                                                                         options: CompilerOptions): CompiledResult {
  /**
   * 生成ast: 解析template, 生成ast
   * */
  const ast = parse(template.trim(), options)
  if (options.optimize !== false) {
    /**
     * optimize (ast, options) 主要是对ast 进行优化,分析出静态不变的内容部分,增加部分属性
     * */
    optimize(ast, options)
  }
  /**
   * generate 根据ast 生成render 函数和 staticRenderFns数组
   * */
  const code = generate(ast, options)
  return {
    ast,
    render: code.render,
    /**
    * staticRenderFns 目前是一个空数组,其实是用来保存template中静态内容的render
    * */
    staticRenderFns: code.staticRenderFns
  }
})
/**
 * 总结,其实template 最终还是转为render函数,render 函数更加底层
 * */

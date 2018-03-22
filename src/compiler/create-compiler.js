/* @flow */

import {extend} from 'shared/util'
import {detectErrors} from './error-detector'
import {createCompileToFunctionFn} from './to-function'

/**
 * 此函数只是compile 和compileToFunctions 的简单封装
 * */
/**
 * compile 和 compileToFunctions 两个方法的不同之处有以下两点
 * 1. compile 返回的结果中render 是字符串,staticRenderFns 是字符串组成的数组,而compileToFunctions 中把它们变成了函数
 * 2. compile 返回的结果中,有模板生成的 ast 和搜集到的错误。 而compileToFunctions 对其结果进行了一些处理
 * */
export function createCompilerCreator(baseCompile: Function): Function {
  return function createCompiler(baseOptions: CompilerOptions) {
    function compile(template: string,
                     /**
                      * options 的内部主要是用户自己定义的delimiters(分隔符)
                      * */
                     options?: CompilerOptions): CompiledResult {
      /**
       * finalOptions 继承 baseOptions
       * */
      const finalOptions = Object.create(baseOptions)
      const errors = []
      const tips = []
      /**
       * 添加一个收集错误的warn 方法
       * */
      finalOptions.warn = (msg, tip) => {
        (tip ? tips : errors).push(msg)
      }
      /**
       * 合并options传入各种配置选项
       * modules 和 directive 合并方法不同,modules 是数组,directive 是一个对象
       *
       * */
      if (options) {
        // merge custom modules
        if (options.modules) {
          finalOptions.modules =
            (baseOptions.modules || []).concat(options.modules)
        }
        // merge custom directives
        if (options.directives) {
          finalOptions.directives = extend(
            Object.create(baseOptions.directives || null),
            options.directives
          )
        }
        // copy other options
        for (const key in options) {
          if (key !== 'modules' && key !== 'directives') {
            finalOptions[key] = options[key]
          }
        }
      }
      /**
       * baseComplies 中执行的就是模版编译的三个重要步骤
       * */
      const compiled = baseCompile(template, finalOptions)
      if (process.env.NODE_ENV !== 'production') {
        errors.push.apply(errors, detectErrors(compiled.ast))
      }
      compiled.errors = errors
      compiled.tips = tips
      return compiled
    }

    return {
      compile,
      compileToFunctions: createCompileToFunctionFn(compile)
    }
  }
}

import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn' // 导入中文语言包
import relativeTime from 'dayjs/plugin/relativeTime' // 相对时间插件
import customParseFormat from 'dayjs/plugin/customParseFormat' // 自定义解析格式插件
import duration from 'dayjs/plugin/duration' // 时间段插件

// 配置dayjs
dayjs.locale('zh-cn') // 使用中文
dayjs.extend(relativeTime) // 启用相对时间插件
dayjs.extend(customParseFormat) // 启用自定义解析格式插件
dayjs.extend(duration) // 启用时间段插件

/**
 * 日期工具类
 */
export default {
  /**
   * 格式化日期
   * @param date 日期对象、时间戳或日期字符串
   * @param format 格式化模板，默认为 YYYY-MM-DD HH:mm:ss
   * @returns 格式化后的日期字符串
   */
  format(date: string | number | Date, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
    if (!date) return ''
    return dayjs(date).format(format)
  },

  /**
   * 获取相对时间
   * @param date 日期对象、时间戳或日期字符串
   * @param referenceDate 参考日期，默认为当前时间
   * @returns 相对时间字符串，如"几分钟前"、"几小时前"等
   */
  fromNow(date: string | number | Date, referenceDate?: string | number | Date): string {
    if (!date) return ''
    return dayjs(date).from(referenceDate || dayjs())
  },

  /**
   * 计算两个日期之间的差值
   * @param date1 第一个日期
   * @param date2 第二个日期，默认为当前时间
   * @param unit 差值单位，可选值：'millisecond', 'second', 'minute', 'hour', 'day', 'month', 'year'
   * @returns 差值
   */
  diff(date1: string | number | Date, date2?: string | number | Date, unit: 'millisecond' | 'second' | 'minute' | 'hour' | 'day' | 'month' | 'year' = 'millisecond'): number {
    if (!date1) return 0
    return dayjs(date1).diff(date2 || dayjs(), unit)
  },

  /**
   * 判断日期是否有效
   * @param date 日期对象、时间戳或日期字符串
   * @returns 是否有效
   */
  isValid(date: string | number | Date): boolean {
    return dayjs(date).isValid()
  },

  /**
   * 获取当前时间
   * @param format 格式化模板，默认为 YYYY-MM-DD HH:mm:ss
   * @returns 格式化后的当前时间字符串
   */
  now(format: string = 'YYYY-MM-DD HH:mm:ss'): string {
    return dayjs().format(format)
  },

  /**
   * 解析日期字符串
   * @param dateString 日期字符串
   * @param format 日期格式
   * @returns dayjs对象
   */
  parse(dateString: string, format: string): dayjs.Dayjs {
    return dayjs(dateString, format)
  },

  /**
   * 获取原始的dayjs对象
   * @param date 日期对象、时间戳或日期字符串
   * @returns dayjs对象
   */
  dayjs(date?: string | number | Date): dayjs.Dayjs {
    return dayjs(date)
  }
}
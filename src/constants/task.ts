export const sortType = {
  title: '排序依据',
  name: 'sort_type',
  items: [
    {
      title: '综合排序',
      value: '0',
      log_value: 'top_all'
    },
    {
      title: '最新发布',
      value: '2',
      log_value: 'top_time'
    },
    {
      title: '最多点赞',
      value: '1',
      log_value: 'top_likes'
    }
  ]
} as const

export const publishTime = {
  title: '发布时间',
  name: 'publish_time',
  items: [
    {
      title: '不限',
      value: '0',
      log_value: 'time_all'
    },
    {
      title: '一天内',
      value: '1',
      log_value: 'within_day'
    },
    {
      title: '一周内',
      value: '7',
      log_value: 'within_week'
    },
    {
      title: '半年内',
      value: '180',
      log_value: 'within_half_year'
    }
  ]
} as const

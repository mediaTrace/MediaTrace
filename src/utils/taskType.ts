export const extractDouyinVideoId = (platform: string, url: string) => {
  if (platform === 'dy') {
    // https://www.douyin.com/user/MS4wLjABAAAAi0JIKW9a-2BYYr7WG3yc491JV2rxVpQQGyAgNuG0q7wEDtB4TG1OOiP6lbHbZZHN?modal_id=7532794288220998912
    // https://www.douyin.com/video/7532794288220998912
    // https://www.douyin.com/jingxuan?modal_id=7532794288220998912
    // 输出: 7532794288220998912

    // https://v.douyin.com/ifkVVBozpwo/ 这类链接输出原链接，因为是短链接会转成原链接

    // 处理抖音短链接：直接返回原链接
    const isDouyinShort = /^https?:\/\/v\.douyin\.com\//.test(url)
    if (isDouyinShort) {
      return url
    }

    // 验证是否为抖音链接
    const isDouyinUrl = /^https?:\/\/(www\.)?douyin\.com\//.test(url)
    if (!isDouyinUrl) {
      return null
    }

    // 处理 /video/ 格式的URL
    const videoRegex = /\/video\/(\d+)/
    let match = url.match(videoRegex)
    if (match) return match[1]

    // 处理 modal_id= 参数格式的URL
    const modalRegex = /[?&]modal_id=(\d+)/
    match = url.match(modalRegex)
    if (match) return match[1]

    return null
  }
  if (platform === 'xhs') {
    // https://www.xiaohongshu.com/explore/62a322f0000000001d013708?xsec_token=ABmdRID00gredSzKlOa5SqtY4Xq0SfdW-XdfNZVcXAcV4=&xsec_source=pc_user
    // 输出: 62a322f0000000001d013708

    // 验证是否为小红书链接，必须包含xsec_token参数
    const isXhsUrl = /^https?:\/\/(www\.)?xiaohongshu\.com\//.test(url) && url.includes('xsec_token=')
    if (!isXhsUrl) {
      return null
    }

    // 处理 /explore/ 格式的URL
    const videoRegex = url.split('/explore/')[1].split(/[?]/)[0]
    if (videoRegex) return url
    
    return null
  }
  return null
}

// 提取URL中的用户ID
export const extractDouyinUserId = (platform: string, url: string) => {
  if (platform === 'dy') {
    // https://www.douyin.com/user/MS4wLjABAAAAi0JIKW9a-2BYYr7WG3yc491JV2rxVpQQGyAgNuG0q7wEDtB4TG1OOiP6lbHbZZHN?from_tab_name=main
    // 输出: MS4wLjABAAAAi0JIKW9a-2BYYr7WG3yc491JV2rxVpQQGyAgNuG0q7wEDtB4TG1OOiP6lbHbZZHN

    // https://v.douyin.com/ifkVVBozpwo/ 这类链接输出原链接，因为是短链接会自动转成原链接

    // 处理抖音短链接：直接返回原链接
    const isDouyinShort = /^https?:\/\/v\.douyin\.com\//.test(url)
    if (isDouyinShort) {
      return url
    }

    // 验证是否为抖音链接
    const isDouyinUrl = /^https?:\/\/(www\.)?douyin\.com\//.test(url)
    if (!isDouyinUrl) {
      return null
    }

    const regex = /\/user\/([^/?]+)/
    const match = url.match(regex)

    // 排除self的情况，如https://www.douyin.com/user/self（这个是自己查看自己的主页）
    if (match && match[1] && match[1].toLowerCase() !== 'self') {
      return match[1]
    }

    return null
  }
  
  if (platform === 'xhs') {
    // https://www.xiaohongshu.com/user/profile/63ca6bf5000000002702a7a3?xsec_token=ABT8BAXFolaApOohrauLDg7YgNhcagdB1v65_uiNz9NUM=&xsec_source=pc_feed
    // 输出: MS4wLjABAAAAi0JIKW9a-2BYYr7WG3yc491JV2rxVpQQGyAgNuG0q7wEDtB4TG1OOiP6lbHbZZHN

    // 验证是否为小红书链接，并且包含profile和xsec_token参数
    const isXhsUrl = /^https?:\/\/(www\.)?xiaohongshu\.com\//.test(url) && url.includes('xsec_token=')
    if (!isXhsUrl) {
      return null
    }

    // 获取用户ID
    const regex = /\/user\/profile\/([^/?]+)/
    const match = url.match(regex)
    if (match) {
      return match[1]
    }
    return null
  }
  return null
}


/*
链接转换函数
参数说明:
url: 链接地址
platform: 平台，可选值：douyin、tiktok
type: 链接类型，video 或 user
返回值:
转换后的链接地址，转换失败则返回 null
*/
export function convertLink(url: string, platform: string, type: string): string { 
  if (platform === 'douyin') {
    // 若传入已是链接，且为抖音短链或完整链接，则直接返回
    if (/^https?:\/\/v\.douyin\.com\//.test(url) || /^https?:\/\/(www\.)?douyin\.com\//.test(url)) {
      return url
    }
    if (type === 'video') {
      // 抖音视频链接转换逻辑
      return 'https://www.douyin.com/video/' + url
    }
    if (type === 'user') {
      // 抖音用户链接转换逻辑
      return 'https://www.douyin.com/user/' + url
    }
  }
  if (platform === 'xhs') {
    if (type === 'video') {
      // 小红书视频链接转换逻辑
      return url
    }
    if (type === 'user') {
      // 小红书用户链接转换逻辑
      return 'https://www.xiaohongshu.com/user/profile/' + url
    }
  }
  return ''
}

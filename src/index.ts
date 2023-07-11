import type { Context, Element } from 'koishi'
import { Schema, h } from 'koishi'

export const name = 'slaction'

export interface Config {
  prefix: string[]
  useAba: boolean
}

export const Config: Schema<Config> = Schema.object({
  prefix: Schema.array(String).default(['/']).description('触发动作的前缀。'),
  useAba: Schema.boolean()
    .default(true)
    .description(
      '输出 ABA。开启后「/拍」输出「拍了拍」，关闭后「/拍」输出「拍了」。'
    ),
})

export function apply(ctx: Context, config: Config) {
  ctx.middleware((session, next) => {
    // 提取有效的 at 元素和文本元素
    const [ats, texts] = session.elements.reduce<
      [
        Element[],
        {
          text: string
          prefix: string
        }[]
      ]
    >(
      (r, e) => {
        switch (e.type) {
          case 'at': {
            r[0].push(e)
            break
          }
          case 'text': {
            let text = (e.attrs.content as string) || ''
            text = text.trim()
            // text 是空的
            if (!text.length) break
            // 检查 prefix 里有没有能够匹配上 text 的
            for (const p of config.prefix)
              if (text.startsWith(p)) {
                r[1].push({
                  text,
                  prefix: p,
                })
                // 只要找见一个就行
                break
              }
            break
          }
        }
        return r
      },
      [[], []]
    )

    // 命中 slaction 的条件是：
    // at 元素的个数为 1-2 个且符合条件的 text 元素的个数为 1 个
    const hit = ats.length >= 1 && ats.length <= 2 && texts.length === 1

    // 没命中就不管了
    if (!hit) return next()

    // 动作的内容是 text 裁掉 prefix 的那一部分
    let action = texts[0].text.slice(texts[0].prefix.length)

    // 如果动作里不带「了」
    if (!action.includes('了')) {
      // 如果动作是一个字的
      if (action.length === 1) {
        if (config.useAba) action = `${action}了${action}`
        else action = `${action}了`
      } else action = `${action}了`
    }

    action = ` ${action} `

    if (ats.length === 1)
      return [
        h.at(session.userId, {
          name: session.username,
        }),
        action,
        ats[0],
        ' ！',
      ]
    else return [ats[0], action, ats[1], ' ！']
  })
}

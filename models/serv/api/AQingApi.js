import lodash from 'lodash'
import EnkaData from './EnkaData.js'
import { Data } from '#miao'

export default {
  id: 'aqing',
  name: 'AQing-Api',
  cfgKey: 'aqingApi',

  async request (api) {
    let token = this.getCfg('token')
    let headers = {
      'User-Agent': this.getCfg('userAgent')
    }
    if (token) {
      headers['X-AQing-Token'] = token
    }
    return { api, params: { headers } }
  },

  async response (data, req) {
    if (!data.playerInfo) {
      if (data.error === 'empty') {
        return req.err('empty', 5 * 60)
      }
      if (data.error) {
        console.log(`AQing ReqErr: ${data.error}`)
      }
      return req.err('error', 60)
    }
    let details = data.avatarInfoList
    if (!details || details.length === 0 || !details[0].propMap) {
      return req.err('empty', 5 * 60)
    }
    return data
  },

  updatePlayer (player, data) {
    player.setBasicData(Data.getData(data.playerInfo, 'name:nickname,face:profilePicture.avatarID,card:nameCardID,level,word:worldLevel,sign:signature'))
    lodash.forEach(data.avatarInfoList, (ds) => {
      let ret = EnkaData.setAvatar(player, ds, 'aqing')
      if (ret) {
        player._update.push(ret.id)
      }
    })
  },

  cdTime (data) {
    return data.ttl || 60
  }
}

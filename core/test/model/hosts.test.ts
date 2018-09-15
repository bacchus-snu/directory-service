import test from 'ava'
import * as uuid from 'uuid/v4'

import * as fs from 'fs'
import Model from '../../src/model/model'
import * as bunyan from 'bunyan'
import Config from '../../src/config'

const config: Config = JSON.parse(fs.readFileSync('config.test.json', {encoding: 'utf-8'}))

const log = bunyan.createLogger({
  name: config.instanceName,
  level: config.logLevel,
})

const model = new Model(config, log)

test('add host and host group', async t => {
  const name = uuid()
  const host = '127.0.0.1'
  const hostGroupName = uuid()
  await model.pgDo(async tr => {
    const hostIdx = await model.hosts.addHost(tr, name, host)
    const query = 'SELECT idx FROM hosts WHERE host = $1'
    const result = await tr.query(query, [host])
    t.is(result.rows[0].idx, hostIdx)
    let byInet = await model.hosts.getHostByInet(tr, host)
    t.is(byInet.idx, hostIdx)

    const hostGroupIdx = await model.hosts.addHostGroup(tr, hostGroupName)
    await model.hosts.addHostToGroup(tr, hostIdx, hostGroupIdx)

    byInet = await model.hosts.getHostByInet(tr, host)
    t.is(byInet.host, host)
    t.is(byInet.hostGroupIdx, hostGroupIdx)

    await model.hosts.deleteHost(tr, hostIdx)
  })
})

test('host authorization', async t => {
  const name = uuid()
  const hostname = '127.0.0.2'
  const hostGroupName = uuid()
  const trans = { ko: uuid(), en: uuid() }
  await model.pgDo(async tr => {
    const hostIdx = await model.hosts.addHost(tr, name, hostname)
    const hostGroupIdx = await model.hosts.addHostGroup(tr, hostGroupName)
    await model.hosts.addHostToGroup(tr, hostIdx, hostGroupIdx)

    const permissionIdx = await model.permissions.create(tr, trans, trans)
    const groupIdx = await model.groups.create(tr, trans, trans)
    const userIdx = await model.users.create(tr, uuid(), uuid(), uuid(), '/bin/bash', 'ko')
    await model.users.addUserMembership(tr, userIdx, groupIdx)
    await model.permissions.addPermissionRequirement(tr, groupIdx, permissionIdx)
    await model.hosts.setHostGroupPermission(tr, hostGroupIdx, permissionIdx)

    const host = await model.hosts.getHostByInet(tr, hostname)
    // should pass
    await model.hosts.authorizeUserByHost(tr, userIdx, host)

    const newPermissionIdx = await model.permissions.create(tr, trans, trans)
    await model.hosts.setHostGroupPermission(tr, hostGroupIdx, newPermissionIdx)
    try {
      await model.hosts.authorizeUserByHost(tr, userIdx, host)
    } catch (e) {
      t.pass()
      await model.hosts.deleteHost(tr, hostIdx)
      return
    }
    await model.hosts.deleteHost(tr, hostIdx)
    t.fail()
  }, ['users', 'group_reachable_cache'])
})

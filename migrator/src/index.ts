import * as mssql from 'mssql'
import * as pg from 'pg'
import * as fs from 'fs'

interface WingsUser {
  uid: number
  account: string | null // username
  name: string // realname
  password: Buffer | null
  bs_number: string | null
  ms_number: string | null
  phd_number: string | null
  is_disabled: boolean | null
}

const config = JSON.parse(fs.readFileSync('config.json', {encoding: 'utf-8'}))

const failed: Array<string> = []

const migrateUser = async (user: WingsUser, duplicates: Array<string>, pgClient: pg.PoolClient, selectEmail: mssql.PreparedStatement) => {
  if (user.account === null) {
    return
  }
  console.log(user.account)
  const addresses: Array<string> = []
  for (const addrRecord of (await selectEmail.execute({userUid: user.uid})).recordset) {
    const address = addrRecord.email
    if (!duplicates.includes(address)) {
      addresses.push(address)
    }
  }

  const addressIdxs: Array<number> = []
  for (const address of addresses) {
    const local = address.split('@')[0]
    const domain = address.split('@')[1]
    if (!local || !domain) {
      continue
    }
    try {
      const result = await pgClient.query('INSERT INTO email_addresses (address_local, address_domain) VALUES ($1, $2) RETURNING idx', [local, domain])
      addressIdxs.push(result.rows[0].idx)
    } catch (e) {
      failed.push(address)
    }
  }

  const userInsertResult = await pgClient.query('INSERT INTO users (username, name, shell, preferred_language) ' +
    'VALUES ($1, $2, \'/bin/bash\', \'ko\') RETURNING idx', [user.account, user.name])
  const userIdx = userInsertResult.rows[0].idx

  for (const emailAddressIdx of addressIdxs) {
    await pgClient.query('UPDATE email_addresses SET owner_idx=$1 where idx=$2', [userIdx, emailAddressIdx])
  }
}

const findDup = (allEmails: Array<string>) => {
  const found: Array<string> = []
  const dup: Array<string> = []
  for (const email of allEmails) {
    if (found.includes(email)) {
      console.error(`dup: ${email}`)
      dup.push(email)
    } else {
      found.push(email)
    }
  }
}

const migrateAll = async () => {
  const mssqlPool = new mssql.ConnectionPool(config.mssql)
  await mssqlPool.connect()
  const mssqlSelectUser = new mssql.PreparedStatement(mssqlPool)
  await mssqlSelectUser.prepare('SELECT * FROM [user]')
  const mssqlSelectEmail = new mssql.PreparedStatement(mssqlPool)
  mssqlSelectEmail.input('userUid', mssql.BigInt)
  await mssqlSelectEmail.prepare('SELECT * FROM user_email WHERE user_uid=@userUid')
  const mssqlSelectAllEmail = new mssql.PreparedStatement(mssqlPool)
  await mssqlSelectAllEmail.prepare('SELECT * FROM user_email')
  const pgClient = await (new pg.Pool(config.postgresql)).connect()
  try {
    const allEmails = (await mssqlSelectAllEmail.execute({})).recordset
    const duplicates = findDup(allEmails)
    for (const user of (await mssqlSelectUser.execute({})).recordset) {
      await migrateUser(user, duplicates, pgClient, mssqlSelectEmail)
    }
  } finally {
    await mssqlSelectUser.unprepare()
    await mssqlSelectEmail.unprepare()
    await mssqlSelectAllEmail.unprepare()
    await mssqlPool.close()
    await pgClient.release()
  }
}

migrateAll().then(_ => console.log(failed)).catch(e => console.log(e))

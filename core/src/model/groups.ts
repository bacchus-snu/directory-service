import Model from './model'
import { Translation } from './translation'
import { PoolClient } from 'pg'
import { NoSuchEntryError } from './errors'

export interface Group {
  idx: number
  ownerUserIdx: number | null
  ownerGroupIdx: number | null
  name: Translation
  description: Translation
}

export default class Groups {
  constructor(private readonly model: Model) {
  }

  public async create(client: PoolClient, name: Translation, description: Translation): Promise<number> {
    const query = 'INSERT INTO groups(name_ko, name_en, description_ko, ' +
      'description_en) VALUES ($1, $2, $3, $4) RETURNING idx'
    const result = await client.query(query, [name.ko, name.en, description.ko, description.en])
    return result.rows[0].idx
  }

  public async getByIdx(client: PoolClient, idx: number): Promise<Group> {
    const query = 'SELECT * FROM groups WHERE idx = $1'
    const result = await client.query(query, [idx])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    return this.rowToGroup(result.rows[0])
  }

  public async delete(client: PoolClient, groupIdx: number): Promise<number> {
    const query = 'DELETE FROM groups WHERE idx = $1 RETURNING idx'
    const result = await client.query(query, [groupIdx])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    return result.rows[0].idx
  }

  public async setOwnerUser(client: PoolClient, groupIdx: number, ownerUserIdx: number | null): Promise<void> {
    const query = 'UPDATE groups SET owner_user_idx = $1 WHERE idx = $2 RETURNING idx'
    const result = await client.query(query, [ownerUserIdx, groupIdx])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
  }

  public async setOwnerGroup(client: PoolClient, groupIdx: number, ownerGroupIdx: number | null): Promise<void> {
    const query = 'UPDATE groups SET owner_group_idx = $1 WHERE idx = $2 RETURNING idx'
    const result = await client.query(query, [ownerGroupIdx, groupIdx])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
  }

  public async addGroupRelation(client: PoolClient, supergroupIdx: number, subgroupIdx: number): Promise<number> {
    const query = 'INSERT INTO group_relations(supergroup_idx, subgroup_idx) ' +
      'VALUES ($1, $2) RETURNING idx'
    const result = await client.query(query, [supergroupIdx, subgroupIdx])
    return result.rows[0].idx
  }

  public async deleteGroupRelation(client: PoolClient, groupRelationIdx: number) {
    const query = 'DELETE FROM group_relations WHERE idx = $1 RETURNING idx'
    const result = await client.query(query, [groupRelationIdx])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    return result.rows[0].idx
  }

  private rowToGroup(row: any): Group {
    return {
      idx: row.idx,
      ownerUserIdx: row.owner_user_idx,
      ownerGroupIdx: row.owner_gropu_idx,
      name: {
        ko: row.name_ko,
        en: row.name_en,
      },
      description: {
        ko: row.description_ko,
        en: row.description_en,
      },
    }
  }
}
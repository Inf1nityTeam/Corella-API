import {BaseRepository} from '@core/repository'
import type {ProjectModel} from './ProjectModel'
import {IProject} from './ProjectModel'
import {Types} from 'mongoose'
import {PageOptions} from '@core/repository/IBaseRepository'
import {DataList} from '@common/data'
import {ExpandProjectPreview} from './schemas/entities'
import type {MemberStatus} from '@app/project/packages/member/MemberStatus'
import type {RolePermission} from '@app/project/packages/role'

export interface AggregatedProjectMemberResult {
  _id: Types.ObjectId,
  member: {
    _id: Types.ObjectId,
    projectId: Types.ObjectId,
    status: MemberStatus,
    role: {
      permissions: RolePermission
    }[]
  }[]
}


export class ProjectRepository extends BaseRepository<IProject> {
  constructor(Model: typeof ProjectModel) {
    super(Model)
  }

  async findUserProjects(userId: Types.ObjectId, query: PageOptions): Promise<DataList<ExpandProjectPreview>> {
    const dataPromise = this.Model
      .aggregate(
        [
          {
            $match: {
              members: userId
            }
          },
          {
            $skip: (query.page - 1) * query.limit
          },
          {
            $limit: query.limit
          },
          {
            $lookup: {
              from: 'project_members',
              let: {
                projectId: '$_id',
                userId: userId
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {$eq: ['$projectId', '$$projectId']},
                        {$eq: ['$userId', '$$userId']}
                      ]
                    }
                  }
                }
              ],
              as: 'member'
            }
          },
          {
            $unwind: '$member'
          },
          {
            $lookup: {
              from: 'project_roles',
              localField: 'member.roleId',
              foreignField: '_id',
              as: 'member.role'
            }
          },
          {
            $unwind: '$member.role'
          },
          {
            $project: {
              name: 1,
              description: 1,
              'member._id': 1,
              'member.status': 1,
              'member.role._id': 1,
              'member.role.name': 1,
              'member.role.createdAt': 1,
              'member.createdAt': 1,
              createdAt: 1
            }
          }
        ]
      )
      .exec()

    const [data, total] = await Promise.all([
      dataPromise,
      this.count(
        {
          members: userId
        }
      )
    ])

    return new DataList<ExpandProjectPreview>(total, Math.ceil(total / query.limit), data)
  }

  pullMemberId(projectId: Types.ObjectId | string, userId: Types.ObjectId | string) {
    return this.updateById(new Types.ObjectId(projectId), {
        $pull: {
          members: new Types.ObjectId(userId)
        }
      })
  }

  pushMemberId(projectId: Types.ObjectId, userId: Types.ObjectId) {
    return this.updateById(projectId, {
      $addToSet: {
        members: userId
      }
    })
  }

  async findProjectMember(projectId: string | Types.ObjectId, userId: string | Types.ObjectId) {
    return this.Model
      .aggregate<AggregatedProjectMemberResult>(
        [
          {
            $match: {_id: new Types.ObjectId(projectId)}
          },
          {
            $lookup: {
              from: 'project_members',
              let: {
                projectId: '$_id',
                userId: new Types.ObjectId(userId)
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {$eq: ['$projectId', '$$projectId']},
                        {$eq: ['$userId', '$$userId']}
                      ]
                    }
                  }
                },
                {
                  $lookup: {
                    from: 'project_roles',
                    let: {
                      projectId: '$projectId',
                      roleId: '$roleId'
                    },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $and: [
                              {$eq: ['$projectId', '$$projectId']},
                              {$eq: ['$_id', '$$roleId']}
                            ]
                          }
                        }
                      }
                    ],
                    as: 'role'
                  }
                },
                {
                  $project: {
                    projectId: 1,
                    status: 1,
                    role: {
                      permissions: 1
                    }
                  }
                }
              ],
              as: 'member'
            }
          },
          {
            $project: {
              member: 1
            }
          }
        ]
      )
      .exec()
  }
}
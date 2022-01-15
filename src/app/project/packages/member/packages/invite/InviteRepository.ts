import {BaseRepository} from 'core/repository'
import {InviteModel, IInvite} from './InviteModel'
import {Types} from 'mongoose'
import {InviteExpand} from './schemas/entities'


export class InviteRepository extends BaseRepository<IInvite> {
  constructor(Model: typeof InviteModel) {
    super(Model)
  }

  async findExpandInvite(inviteId: Types.ObjectId | string): Promise<InviteExpand> {
    return this.Model
      .aggregate(
        [
          {
            $match: {_id: new Types.ObjectId(inviteId)}
          },
          {
            $lookup: {
              from: 'projects',
              localField: 'projectId',
              foreignField: '_id',
              as: 'project'
            }
          },
          {
            $unwind: '$project'
          },
          {
            $lookup: {
              from: 'project_roles',
              localField: 'roleId',
              foreignField: '_id',
              as: 'role'
            }
          },
          {
            $unwind: '$role'
          },
          {
            $project: {
              'project._id': 1,
              'project.name': 1,
              'role._id': 1,
              'role.name': 1
            }
          }
        ]
      )
      .exec()
      .then(result => result[0])
  }
}
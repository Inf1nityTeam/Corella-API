import {MemberRouteOptions} from './index'
import {FastifyInstance} from 'fastify'
import {BadRequest, MessageResponse, NotFound} from '@common/schemas/response'
import {MemberNotExistsError} from '@app/project/packages/member/member-error'


export interface ChangeRoleRequest {
  Params: {
    projectId: string,
    memberId: string
  },
  Body: {
    roleId: string
  }
}


export async function changeRole(fastify: FastifyInstance, {memberService, memberSchemas}: MemberRouteOptions) {
  return fastify
    .route<ChangeRoleRequest>(
      {
        url: '/project/:projectId/member/:memberId',
        method: 'PATCH',
        schema: {
          summary: 'Change member role',
          tags: ['Project Member'],
          params: {
            projectId: memberSchemas.properties.projectId,
            memberId: memberSchemas.properties._id
          },
          body: {
            type: 'object',
            properties: {
              roleId: memberSchemas.properties.roleId
            },
            additionalProperties: false,
            required: ['roleId'],
            errorMessage: {
              required: {
                roleId: 'Select the member role'
              }
            }
          },
          response: {
            [200]: new MessageResponse('The participant\'s role has been successfully updated'),
            [400]: new BadRequest().bodyErrors(),
            [404]: new NotFound(
              MemberNotExistsError.schema()
            )
          }
        },
        security: {
          auth: true
        },
        handler: async function(request, reply) {
          await memberService.changeMemberRole(request.params.projectId, request.params.memberId, request.body.roleId)

          reply
            .code(200)
            .type('application/json')
            .send({message: 'The participant\'s role has been successfully updated'})
        }
      }
    )
}
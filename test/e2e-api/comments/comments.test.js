const {agentProvider, mockManager, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyEtag, anyObjectId, anyLocationFor, anyISODateTime, anyUuid} = matchers;

let membersAgent, membersService, postId, commentId;

const commentMatcher = {
    id: anyObjectId,
    created_at: anyISODateTime
};

const commentMatcherWithMember = {
    id: anyObjectId,
    created_at: anyISODateTime,
    member: {
        id: anyObjectId
    }
};

describe('Comments API', function () {
    before(async function () {
        const agents = await agentProvider.getAgentsForComments();
        membersAgent = agents.membersAgent;

        await fixtureManager.init('posts', 'members', 'comments');

        postId = fixtureManager.get('posts', 0).id;
    });

    afterEach(function () {
        mockManager.restore();
    });

    describe('when not authenticated', function () {
        it('can browse posts');
    });

    describe('when authenticated', function () {
        before(async function () {
            await membersAgent.loginAs('member@example.com');
        });

        it('Can comment on a post', async function () {
            await membersAgent
                .post(`/api/comments/`)
                .body({comments: [{
                    post_id: postId,
                    html: 'This is a message'
                }]})
                .expectStatus(201)
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    location: anyLocationFor('comments')
                })
                .matchBodySnapshot({
                    comments: [commentMatcher]
                });
            // Save for other tests
            commentId = body.comments[0].id;
        });

        it('Can browse all comments of a post', async function () {
            await membersAgent
                .get(`/api/comments/?filter=post_id:${postId}&include=member`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    comments: new Array(3).fill(commentMatcherWithMember)
                });
        });

        it('Can like a comment', async function () {
            // Create a temporary comment
            const {body} = await membersAgent
                .post(`/api/comments/${commentId}/like/`)
                .expectStatus(204)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .expectEmptyBody();
        });

        it('Cannot like a comment multiple times', async function () {
            // Create a temporary comment
            const {body} = await membersAgent
                .post(`/api/comments/${commentId}/like/`)
                .expectStatus(400)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    errors: [{
                        id: anyUuid
                    }]
                });
        });

        it('Can remove a like', async function () {
            // Create a temporary comment
            const {body} = await membersAgent
                .delete(`/api/comments/${commentId}/like/`)
                .expectStatus(204)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .expectEmptyBody();
        });
    });
});

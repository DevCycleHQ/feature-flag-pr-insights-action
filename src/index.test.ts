jest.mock('child_process', () => {
    return {
        execSync: jest.fn().mockResolvedValue('DevCycle Variable Changes'),
    }
})

jest.mock('@actions/github', () => {
    return {
        context: {
            repo: {
                owner: 'devcycle',
                repo: 'insights-repo'
            },
            payload: {
                pull_request: {
                    number: 1,
                    base: {
                        ref: 'master'
                    },
                    head: {
                        ref: 'my_branch'
                    },
                    html_url: 'https://github.com/devcycle/insights-repo/pull-requests/1'
                }
            }
        },
        getOctokit: jest.fn().mockReturnValue({
            rest: {
                issues: {
                    listComments: jest.fn().mockResolvedValue({
                        data: [{
                            user: {
                                login: 'github-actions[bot]'
                            },
                            body: 'DevCycle Variable Changes'
                        }]
                    }),
                    updateComment: jest.fn(),
                    createComment: jest.fn()
                }
            }
        })
    }
})

jest.mock('@actions/core', () => {
    return {
        getInput: jest.fn().mockReturnValue(''),
        setFailed: jest.fn(),
        warning: jest.fn(),
    }
})

jest.mock('axios', () => {
    return {
        get: jest.fn((url) => {
            let data: any = { links: { self: { href: '' } } }
            if (url.includes('/comments')) data = { values: [] }
            return Promise.resolve({ data })
        }),
        post: jest.fn(() => Promise.resolve({ data: {} })),
        put: jest.fn(() => Promise.resolve({ data: {} }))
    }
})

describe('DevCycle PR Insights action test', () => {
    const consoleSpy = jest.spyOn(console, 'warn')
    const originalEnv = process.env

    beforeEach(() => {
        jest.resetModules()
        jest.clearAllMocks()
        process.env = { ...originalEnv }
        process.env.BITBUCKET_PR_ID = '1'
        process.env.USER_NAME = 'user'
        process.env.PASSWORD = 'pw'
        process.env.BITBUCKET_WORKSPACE = 'my_workspace'
        process.env.BITBUCKET_REPO_SLUG = 'my_repo'
    })

    it(('throws error when missing BITBUCKET_PR_ID'), async () => {
        delete process.env.BITBUCKET_PR_ID
        const { run } = require('./index')

        await expect(run).rejects.toThrowError('Requires a pull request')
    })

    test.each([
        'USER_NAME', 'PASSWORD'
    ])('throws error when missing %s', async (prop) => {
        delete process.env[prop]
        const { run } = require('./index')
        await expect(run).rejects.toThrowError('Bitbucket USER_NAME & PASSWORD are required')
    })

    it(('calls the dvc cli with auth details'), async () => {
        process.env.PROJECT_KEY = 'my_project'
        process.env.CLIENT_ID = 'client1'
        process.env.CLIENT_SECRET = 'supersecret'

        const { execSync } = require('child_process')
        const { run } = require('./index')

        await run()
        expect(execSync).toHaveBeenCalledWith(
            expect.stringContaining('--project my_project --client-id client1 --client-secret supersecret')
        )
    })

    it('sends request to create a PR comment', async () => {
        const axios = require('axios')
        const { run } = require('./index')

        await run()
        expect(axios.post).lastCalledWith(
            'https://api.bitbucket.org/2.0/repositories/my_workspace/my_repo/pullrequests/1/comments',
            expect.objectContaining({}),
            expect.objectContaining({})
        )
    })

    it('sends request to update an existing PR comment', async () => {
        const axios = require('axios')
        const { run } = require('./index')

        axios.get.mockImplementation((url: string) => {
            let data: any = { links: { self: { href: '' } } }
            if (url.includes('/comments')) {
                data = {
                    values: [{
                        id: '123',
                        content: { raw: 'DevCycle Variable Changes' }
                    }]
                }
            }
            return Promise.resolve({ data })
        })

        await run()
        expect(axios.put).lastCalledWith(
            'https://api.bitbucket.org/2.0/repositories/my_workspace/my_repo/pullrequests/1/comments/123',
            expect.objectContaining({}),
            expect.objectContaining({})
        )
    })

})

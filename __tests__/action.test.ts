import * as action from '../src/action'

jest.mock('@actions/core')
jest.mock('@actions/exec')

const mockInputs: Record<string, string> = {
    'github-token': 'mock-gitub-token',
    'project-key': 'mock-project-key',
    'client-id': 'mock-client-id',
    'client-secret': 'mock-client-secret'
}

describe('run', () => {
    const core = require('@actions/core')
    const exec = require('@actions/exec')
    const github = require('@actions/github')
    const octokit = {} as any

    beforeEach(() => {
        jest.clearAllMocks()
        github.context = {
            repo: {
                owner: 'mock-owner',
                repo: 'mock-repo'
            },
            payload: {
                pull_request: {
                    base: { ref: 'mock-base-branch' },
                    head: { ref: 'mock-head-branch' },
                    number: 1456,
                }
            }
        }
        core.getInput = jest.fn().mockImplementation((key) => mockInputs[key])
        octokit.rest = {
            issues: {
                listComments: jest.fn(),
                updateComment: jest.fn(),
                createComment: jest.fn(),
                deleteComment: jest.fn()
            }
        }
        github.getOctokit = jest.fn().mockReturnValue(octokit)
        exec.getExecOutput = jest.fn().mockResolvedValue({ stdout: '' })
    })

    it('fails when missing github-token', async () => {
        const inputs = { ...mockInputs }
        delete inputs['github-token']
        core.getInput = jest.fn().mockImplementation((key) => inputs[key])

        await action.run()

        expect(core.setFailed).toBeCalledWith('Missing github token')
    })

    it('fails when unable to get octokit client', async () => {
        github.getOctokit = jest.fn().mockReturnValue(null)

        await action.run()

        expect(core.setFailed).toBeCalledWith('No octokit client')
    })

    it('exits and logs a warning when not run on pull request', async () => {
        delete github.context.payload.pull_request

        await action.run()

        expect(core.warning).toBeCalledWith('Requires a pull request')
    })

    it('dvc diff command is executed with auth arguments when all are defined', async () => {
        await action.run()

        expect(exec.getExecOutput).toBeCalledWith(
            'dvc',
            [
                'diff',
                'origin/mock-base-branch...origin/mock-head-branch',
                '--format', 'markdown',
                '--caller', 'github.pr_insights',
                '--project', 'mock-project-key',
                '--client-id', 'mock-client-id',
                '--client-secret', 'mock-client-secret'
            ]
        )
    })

    test.each([
        'project-key', 'client-id', 'client-secret'
    ])('dvc diff command is executed without auth arguments when %s is not set', async (param) => {
        const inputs = { ...mockInputs }
        delete inputs[param]
        core.getInput = jest.fn().mockImplementation((key) => inputs[key])

        await action.run()

        expect(exec.getExecOutput).toBeCalledWith(
            'dvc',
            [
                'diff',
                'origin/mock-base-branch...origin/mock-head-branch',
                '--format', 'markdown',
                '--caller', 'github.pr_insights',
            ]
        )
    })

    it('dvc diff command is executed with the pr-link when defined', async () => {
        github.context.payload.pull_request.html_url = 'mock-pr-link'

        await action.run()

        expect(exec.getExecOutput).toBeCalledWith(
            'dvc',
            [
                'diff',
                'origin/mock-base-branch...origin/mock-head-branch',
                '--format', 'markdown',
                '--caller', 'github.pr_insights',
                '--pr-link', 'mock-pr-link',
                '--project', 'mock-project-key',
                '--client-id', 'mock-client-id',
                '--client-secret', 'mock-client-secret'
            ]
        )
    })

    test.each([
        {
            user: { login: 'github-actions[bot]' },
            body: 'random bot comment'
        },
        {
            user: { login: 'some-user' },
            body: 'Gee, that DevCycle Variable Changes action sure is useful!'
        }
    ])('PR comment is created if no matching comment exists', async (mockComment) => {
        octokit.rest.issues.listComments = jest.fn().mockReturnValue({ data: [mockComment] })

        await action.run()

        expect(octokit.rest.issues.listComments).toBeCalledWith({
            owner: 'mock-owner',
            repo: 'mock-repo',
            issue_number: 1456,
        })
        expect(octokit.rest.issues.createComment).toBeCalledWith({
            owner: 'mock-owner',
            repo: 'mock-repo',
            issue_number: 1456,
            body: expect.stringContaining('Last Updated')
        })
        expect(octokit.rest.issues.updateComment).not.toBeCalled()
    })

    test.each([
        'DevCycle Variable Changes',
        'No DevCycle Variables Changed'
    ])('PR comment is updated if a comment already exists: %s', async (commentContent) => {
        octokit.rest.issues.listComments = jest.fn().mockReturnValue({ data: [{
            id: 'exisitng-comment-id',
            user: { login: 'github-actions[bot]' },
            body: `${commentContent} \n Last Updated: Wed, 29 Mar 2023 18:30:39 GMT \n <!-- Generated by DevCycle PR Insights -->`
        }] })

        await action.run()

        expect(octokit.rest.issues.listComments).toBeCalledWith({
            owner: 'mock-owner',
            repo: 'mock-repo',
            issue_number: 1456,
        })
        expect(octokit.rest.issues.updateComment).toBeCalledWith({
            owner: 'mock-owner',
            repo: 'mock-repo',
            comment_id: 'exisitng-comment-id',
            body: expect.stringContaining('Last Updated')
        })
        expect(octokit.rest.issues.createComment).not.toBeCalled()
    })

    it('PR comment is not created if no changes exist and only-comment-on-change is true', async () => {
        const inputs: Record<string, string | boolean> = { ...mockInputs, 'only-comment-on-change': true }
        core.getInput = jest.fn().mockImplementation((key) => inputs[key])

        const cliOutput = '\nNo DevCycle Variables Changed\n'
        exec.getExecOutput = jest.fn().mockResolvedValue({ stdout: cliOutput })


        octokit.rest.issues.listComments = jest.fn().mockReturnValue({ data: [] })

        await action.run()

        expect(octokit.rest.issues.deleteComment).not.toBeCalled()
        expect(octokit.rest.issues.updateComment).not.toBeCalled()
        expect(octokit.rest.issues.createComment).not.toBeCalled()
    })

    it('PR comment is removed if no changes exist and only-comment-on-change is true', async () => {
        const inputs: Record<string, string | boolean> = { ...mockInputs, 'only-comment-on-change': true }
        core.getInput = jest.fn().mockImplementation((key) => inputs[key])

        const cliOutput = '\nNo DevCycle Variables Changed\n'
        exec.getExecOutput = jest.fn().mockResolvedValue({ stdout: cliOutput })


        octokit.rest.issues.listComments = jest.fn().mockReturnValue({ data: [{
            id: 'exisitng-comment-id',
            user: { login: 'github-actions[bot]' },
            body: 'DevCycle Variable Changes \n Last Updated: Wed, 29 Mar 2023 18:30:39 GMT \n <!-- Generated by DevCycle PR Insights -->'
        }] })

        await action.run()

        expect(octokit.rest.issues.deleteComment).toBeCalledWith({
            owner: 'mock-owner',
            repo: 'mock-repo',
            comment_id: 'exisitng-comment-id',
        })
        expect(octokit.rest.issues.updateComment).not.toBeCalled()
    })

    it('PR comment body includes output from CLI command', async () => {
        const cliOutput = 'Some text value \n 1. variable change \n 2. another variable change'
        exec.getExecOutput = jest.fn().mockResolvedValue({ stdout: cliOutput })

        await action.run()

        expect(octokit.rest.issues.createComment).toBeCalledWith(expect.objectContaining({
            body: expect.stringContaining(`${cliOutput} \n\n Last Updated:`)
        }))
    })
})
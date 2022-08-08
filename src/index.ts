import * as github from '@actions/github'
import * as core from '@actions/core'
import {exec, getExecOutput} from '@actions/exec'

const { owner, repo } = github.context.repo
const pullRequest = github.context.payload.pull_request
const token = core.getInput('github-token')
const projectKey = core.getInput('project-key')
const clientId = core.getInput('client-id')
const clientSecret = core.getInput('client-secret')
const octokit = token && github.getOctokit(token)

async function run() {
    if (!token) {
        core.setFailed('Missing github token')
        return
    }

    if (!octokit) {
        core.setFailed('No octokit client')
        return
    }

    if (!pullRequest) {
        core.warning('Requires a pull request')
        return
    }

    const baseBranch = pullRequest.base.ref
    const headBranch = pullRequest.head.ref

    await exec('npm', ['install', '-g', '@devcycle/cli@4.2.0'])

    const prLink = pullRequest?.html_url
    const prLinkArgs = prLink ? ['--pr-link', prLink] : []

    const authArgs = projectKey && clientId && clientSecret
        ? ['--project', projectKey, '--client-id', clientId, '--client-secret', clientSecret]
        : []

    const output = await getExecOutput(
        'dvc',
        ['diff', `origin/${baseBranch}...origin/${headBranch}`, '--format', 'markdown', ...prLinkArgs, ...authArgs]
    )

    const pullRequestNumber = pullRequest.number
    const commentIdentifier = 'DevCycle Variable Changes'

    try {
        const existingComments = await octokit.rest.issues.listComments({
            owner,
            repo,
            issue_number: pullRequestNumber,
        })

        const commentToUpdate = existingComments?.data.find((comment: any) => (
            comment.user.login === 'github-actions[bot]' &&
            comment.body.includes(commentIdentifier)
        ))

        const commentBody = `${output.stdout} \n\n Last Updated: ${(new Date()).toUTCString()}`
        if (commentToUpdate) {
            await octokit.rest.issues.updateComment({
                owner,
                repo,
                comment_id: commentToUpdate.id,
                body: commentBody
            })
        } else {
            await octokit.rest.issues.createComment({
                owner,
                repo,
                issue_number: pullRequestNumber,
                body: commentBody
            })
        }
    } catch (err: any) {
        core.error(err)
        throw err
    }
}

run()

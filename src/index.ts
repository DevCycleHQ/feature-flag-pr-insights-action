import * as github from '@actions/github'
import * as core from '@actions/core'
import {exec, getExecOutput} from '@actions/exec'
import md5 from 'md5'
import { sha256 } from 'js-sha256'

const { owner, repo } = github.context.repo
const token = core.getInput('github-token')
const octokit = token && github.getOctokit(token)
const dvcClient: any = {variable: () => {}}

const test = true

dvcClient.variable(test, "test", test)

function formatLinks(output: string): string {
    const singleLines = output.matchAll(/Location: (.*)\s*/g)
    const multiLines = output.matchAll(/- ([^:]*):(.*)\n/g)
    const lines = [...singleLines, ...multiLines]

    const prUrl = github.context.payload.pull_request?.html_url
    if (!prUrl) return output

    let newOutput = output
    const checkDuplicates: Record<string, boolean> = {}
    for (const [text, fileName, lineNumber] of lines) {
        if (checkDuplicates[text]) continue
        const fullPath = `${fileName}:${lineNumber}`

        newOutput = newOutput.replace(
            new RegExp(fullPath, 'g'),
            `[${fullPath}](${prUrl}/files#diff-${sha256(fileName)}R${lineNumber.replace("L", "")})`
        )
        checkDuplicates[text] = true
    }

    return newOutput.replace(/\t/g, '  ')
}

async function run() {
    if (!token) {
        core.setFailed('Missing github token')
        return
    }

    if (!octokit) {
        core.setFailed('No octokit client')
        return
    }

    if (!github.context.payload.pull_request) {
        core.warning('Requires a pull request')
        return
    }

    const baseBranch = github.context.payload.pull_request.base.ref
    const headBranch = github.context.payload.pull_request.head.ref

    await exec('npm', ['install', '-g', '@devcycle/cli@1.0.7'])

    const output = await getExecOutput('dvc', ['diff', `origin/${baseBranch}...origin/${headBranch}`])

    const pullRequestNumber = github.context.payload.pull_request?.number
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

        const commentBody = `${formatLinks(output.stdout)} \n\n Last Updated: ${(new Date()).toUTCString()}`

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

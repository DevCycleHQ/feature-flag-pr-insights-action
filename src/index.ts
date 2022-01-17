const github = require('@actions/github')
const core = require('@actions/core')

const { owner, repo } = github.context.repo
const token = core.getInput('repo-token')
const octokit = token && github.getOctokit(token)

async function run() {
    if (!octokit) {
        core.debug('No octokit client')
        return;
    }

    if (!github.context.payload.pull_request) {
        core.debug('Requires a pull request')
        return
    }

    try {
        await octokit.pulls.createReviewComment({
            owner,
            repo,
            pull_number: github.context.payload.pull_request?.number,
            body: 'Hello world'
        })
    } catch (err) {
        core.error(err)
        throw err
    }
}

run()
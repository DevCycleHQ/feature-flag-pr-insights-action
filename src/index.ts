const github = require('@actions/github')
const core = require('@actions/core')

const { owner, repo } = github.context.repo
const token = core.getInput('github-token')
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

    if (!github.context.payload.pull_request) {
        core.warning('Requires a pull request')
        return
    }

    console.log(JSON.stringify(github.context.payload))

    try {
        await octokit.rest.issues.createComment({
            owner,
            repo,
            issue_number: github.context.payload.pull_request?.number,
            body: 'Hello world'
        })
    } catch (err) {
        core.error(err)
        throw err
    }
}

run()
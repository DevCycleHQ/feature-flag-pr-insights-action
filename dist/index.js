"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const github = require('@actions/github');
const core = require('@actions/core');
const { owner, repo } = github.context.repo;
const token = core.getInput('repo-token');
const octokit = token && github.getOctokit(token);
function run() {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        if (!octokit) {
            core.debug('No octokit client');
            return;
        }
        if (!github.context.payload.pull_request) {
            core.debug('Requires a pull request');
            return;
        }
        try {
            yield octokit.pulls.createReviewComment({
                owner,
                repo,
                pull_number: (_a = github.context.payload.pull_request) === null || _a === void 0 ? void 0 : _a.number,
                body: 'Hello world'
            });
        }
        catch (err) {
            core.error(err);
            throw err;
        }
    });
}
run();

'use strict';
import superAgent from 'superagent';
import configuration from '../ludwig-conf';

const GITHUB_API_REPO_URL_PREFIX = 'https://api.github.com/repos/';

class GithubHelper {
	constructor() {
		this.githubConfig = {
			referencesEndpoint: `${GITHUB_API_REPO_URL_PREFIX}${configuration.repository}/git/refs`,
			createContent: `${GITHUB_API_REPO_URL_PREFIX}${configuration.repository}/contents/`,
			createPullRequest: `${GITHUB_API_REPO_URL_PREFIX}${configuration.repository}/pulls`,
			repository:configuration.repository
		};
	}

	config() {
		return this.githubConfig;
	}

	agent() {
		return superAgent;
	}

	createPullRequestRequestBody(head, title, body) {
		const pullRequestBody = {
			head:`refs/heads/${head}`,
			base:'master',
			title:title,
			body:body
		};
		return JSON.stringify(pullRequestBody);
	}

	createPullRequest(head, title, body, accessToken) {
		return new Promise( (resolve, reject) => {
			this.agent()
				.post(this.config().createPullRequest)
				.send(this.createPullRequestRequestBody(head, title, body))
				.set('Authorization', `token ${accessToken}`)
				.end((err, createPRResult) => {
					if(err) {
						reject({message:err.message, details:err});
					} else {
						resolve(createPRResult);
					}
				});
		});
	}

	createContentRequestBody(testFileName, branchName, commitMessage, base64FileContents) {
		const contentRequestBodyJSON = {
			path:testFileName,
			branch:branchName,
			message:commitMessage,
			content:base64FileContents
		};
		return JSON.stringify(contentRequestBodyJSON);
	}

	createContent(accessToken, testFileName, branchName, commitMessage, base64FileContents) {
		return new Promise( (resolve, reject) => {
			this.agent()
				.put(`${this.config().createContent}${testFileName}`)
				.send(this.createContentRequestBody(testFileName, branchName, commitMessage, base64FileContents))
				.set('Authorization', `token ${accessToken}`)
				.end((err, createCommitResult) => {
					if(err) {
						console.error(err);
						reject({message:err.message, details:err});
					} else {
						resolve(createCommitResult);
					}
				});
		});
	}

	createReferenceRequestBody(newBranchName, branchToCreatePullRequestsFor) {
		const referenceRequestJSONBody = {
			ref:`refs/heads/${newBranchName}`,
			sha:branchToCreatePullRequestsFor
		};
		return JSON.stringify(referenceRequestJSONBody);
	}

	createReference(accessToken, newBranchName, branchToCreatePullRequestsFor) {
		return new Promise( (resolve, reject) => {
			this.agent()
				.post(this.config().referencesEndpoint)
				.send(this.createReferenceRequestBody(newBranchName, branchToCreatePullRequestsFor))
				.set('Authorization', `token ${accessToken}`)
				.end((err, createReferenceResult) => {
					if(err) {
						console.error(err);
						reject({message:err.message, details:err});
					} else {
						resolve(createReferenceResult);
					}
				});
		});
	}

	getHeadReferenceForBranch(requestedBranch) {
		return new Promise( (resolve, reject) => {
			this.agent()
				.get(this.config().referencesEndpoint)
				.end((err, response) => {
					if(err) {
						reject({message: 'Not able to retrieve references', details: err && err.message});
					} else {
						const responseBody = response.body;
						if (responseBody && Array.isArray(responseBody)) {
							let branchRef;
							responseBody.forEach((singleReference) => {
								if (singleReference.ref === `refs/heads/${requestedBranch}`) {
									branchRef = singleReference.object.sha;
								}
							});
							if (branchRef) {
								resolve(branchRef);
							} else {
								reject({
									message: 'Required branch not found',
									details: `Reference searched for: refs/heads/${requestedBranch}`
								});
							}
						} else {
							reject({message: 'Not able to retrieve references', details: 'Body does not contain references list'});
						}
					}
				});
		});

	}
}

export {GithubHelper};
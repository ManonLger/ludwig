/*global describe it beforeEach afterEach*/
import {assert} from 'chai';
import sinon from 'sinon';
import ludwigDAO from '../../database/ludwigDAO';
import {TestSuiteModel} from '../../database/models/testSuiteModel';
import {TestCaseModel} from '../../database/models/testCaseModel';
import mongoose from 'mongoose';

describe('Ludwig DAO', () => {
	describe('saveCompleteTestSuite', () => {
		it('should return a resolved promise if DAO saves both test suite and test cases without errors', (done) => {
			//setup
			sinon.stub(TestSuiteModel.prototype, 'save').yields(null, {saved:'data'});
			TestCaseModel.collection = {insert:sinon.stub().yields(null, [])};
			//action
			ludwigDAO.saveCompleteTestSuite({testCases:[]})
				.then( (data) => {
					//assert
					TestSuiteModel.prototype.save.restore();
					assert.deepEqual(data, {saved:'data'});
					done();
				})
				.catch( (err) => {
					TestSuiteModel.prototype.save.restore();
					done(err);
				});
		});

		it('should return a rejected promise if test suite save fails', (done) => {
			//setup
			sinon.stub(TestSuiteModel.prototype, 'save').yields(new Error('test suite save failed'));
			//action
			ludwigDAO.saveCompleteTestSuite({})
				.then( () => {
					TestSuiteModel.prototype.save.restore();
					done(new Error('ludwigDAO should return a rejected promise if test suite save fails'));
				})
				.catch( (err) => {
					//assert
					assert.equal(err.message, 'test suite save failed');
					TestSuiteModel.prototype.save.restore();
					done();
				});
		});

		it('should return an rejected promise if testCase collection for test suite fails', (done) => {
			//setup
			sinon.stub(TestSuiteModel.prototype, 'save').yields(null, {saved:'data'});
			TestCaseModel.collection = {insert:sinon.stub().yields(new Error('test cases save failed'))};
			//action
			ludwigDAO.saveCompleteTestSuite({})
				.then(() => {
					TestSuiteModel.prototype.save.restore();
					done(new Error('should reject if we cannot save test cases collection'));
				})
				.catch( (err) => {
					//assert
					TestSuiteModel.prototype.save.restore();
					assert.equal(err.message, 'test cases save failed');
					done();
				} );
		});

		it('should return an rejected promise if test suite update fails', (done) => {
			//setup
			const saveStub = sinon.stub(TestSuiteModel.prototype, 'save');
			saveStub.onFirstCall().yields(null, {saved:'data'});
			saveStub.onSecondCall().yields(new Error('test suite update failed'));
			TestCaseModel.collection = {insert:sinon.stub().yields(null, {})};
			//action
			ludwigDAO.saveCompleteTestSuite({})
				.then(() => {
					TestSuiteModel.prototype.save.restore();
					done(new Error('should reject if we cannot update test suite'));
				})
				.catch( (err) => {
					//assert
					TestSuiteModel.prototype.save.restore();
					assert.equal(err.message, 'test suite update failed');
					done();
				} );
		});
		//cleanup ? transaction? concaténation d'opérations?

	});

	describe('getTestHistoryByName', () => {
		const testCaseModelFind = {
			sort: () => {
				const sort = () => {
				};
				sort.exec = (callback) => {
					callback(null, [ {timestamp: 0} ]);
				};
				return sort;
			}
		};

		beforeEach(() => {
			sinon.stub(mongoose.Model, 'find').returns(testCaseModelFind);
		});

		afterEach(() => {
			mongoose.Model.find.restore();
		});

		it('should enrich data using addFormattedTimestamps before resolving', (done) => {
			//setup
			sinon.spy(ludwigDAO, 'addFormattedTimestamps');
			//action
			ludwigDAO.getTestHistoryByName('name')
				.then((enrichedData) => {
					//assert
					assert.equal(ludwigDAO.addFormattedTimestamps.calledOnce, true);
					assert.isString(enrichedData[0].formattedTimestamp);
					done();
				})
				.catch((err) => {
					done(err);
				});
		});
	});


	it('should add the "formattedTimestamp" property to each testCase found in the database for a specific name', () => {
		//setup
		//action
		const actual = ludwigDAO.addFormattedTimestamps([ {timestamp: 0}, {timestamp: 20000} ]);
		//assert
		assert.equal(actual[0].timestamp, 0);
		assert.match(actual[0].formattedTimestamp, /^01\/01\/1970 à [0-9]{2}:00:00$/);
		assert.equal(actual[1].timestamp, 20000);
		assert.match(actual[1].formattedTimestamp, /^01\/01\/1970 à [0-9]{2}:00:20$/);
	});

	describe('getTestHistoryFilteredByName', () => {
		const stubbedTestSuiteModelFind = {
			sort: () => {
				const sort = () => {
				};
				sort.populate = () => {
					const populate = () => {
					};
					populate.exec = (callback) => {
						callback(null, [ {testCases: [ {author: {githubId: 'foo'}}, {author: {githubId: 'bar'}} ]} ]);
					};
					return populate;
				};
				return sort;
			}
		};

		beforeEach(() => {
			sinon.stub(mongoose.Model, 'find').returns(stubbedTestSuiteModelFind);
		});

		afterEach(() => {
			mongoose.Model.find.restore();
		});

		it('should not filter results if nameToFilterWith is empty', () => {
			//setup
			//action
			ludwigDAO.getTestHistoryFilteredByName('')
				.then( (testHistory) => {
					//assert
					assert.deepEqual(testHistory, {testCases: [ {author: {githubId: 'foo'}}, {author: {githubId: 'bar'}} ]} );
				});
		});

		it('should not filter results if nameToFilterWith is null', () => {
			//setup
			//action
			ludwigDAO.getTestHistoryFilteredByName(null)
				.then( (testHistory) => {
					assert.deepEqual(testHistory, {testCases: [ {author: {githubId: 'foo'}}, {author: {githubId: 'bar'}} ]} );
				});
		});

		it('should only show testCases by "foo" if nameToFilterWith equals foo and there is a testCase where "foo" is an author', () => {
			//setup
			//action

			ludwigDAO.getTestHistoryFilteredByName('foo')
				.then( (testHistory) => {
					//assert
					assert.deepEqual(testHistory, {testCases: [ {author: {githubId: 'foo'}} ]} );
				});
		});

		it('should return an empty test case list if nameToFilterWith equals foobar and there no testCase where "foobar" is an author', () => {
			//setup
			//action
			ludwigDAO.getTestHistoryFilteredByName('foobar')
				.then( (testHistory) => {
					//assert
					assert.deepEqual(testHistory, {testCases: []} );
				});
		});
	});
});
const registryUrl = 'https://registry.npmjs.org';
const axios = require('axios');
const yargs = require('yargs');
const async = require('async');
const treeify = require('treeify');
const npa = require('npm-package-arg');
const argv = yargs.argv;
const name = argv.name || argv._[0] || '';

let packageList = {};
let packageInfo = {};

let getPackageQueue = async.queue(function (task, callback) {
  getPackage(task, callback);
});

getPackageQueue.drain(function () {
  let data = formatPackageData(packageList, packageList);
  let output = { [name]: data[name] };
  let treeString = "|" + treeify.asTree(output, true).replace(/├/g, '|-').replace(/└/g, '|-').replace(/─ /g, '-').replace(/\n/g, '\n|');
  console.log(`${name}的依赖包如下`);
  console.log(treeString);
});

function getPackageJson(params) {
  let { packageName } = params;
  let url = registryUrl.replace(/\/$/, '') + '/' + packageName;
  return axios.get(url);
}

function getPackagegeDependencies(packageJson) {
  let packageInfo = {};
  let { dependencies, devDependencies } = packageJson;
  if (dependencies) {
    packageInfo = { ...packageInfo, ...dependencies };
  }
  return packageInfo;
}

async function getPackageInfo(name, callback) {
  let packageName = name && npa(name).escapedName;
  const result = await getPackageJson({ packageName }).then((e) => e.data);
  const packageVersion = result['dist-tags'] && result['dist-tags'].latest;
  const packageJson = result.versions[packageVersion];
  const packageDependencies = getPackagegeDependencies(packageJson);
  packageName = npa(name).name
  const returnData = { packageName, packageVersion, packageDependencies };
  callback && callback(returnData);
  return returnData;
}

function mapPackage(params, callback) {
  let { packageName, packageDependencies } = params;
  if (packageName in packageList) {
    callback && callback();
    return;
  }
  packageList[packageName] = params;

  for (const key in packageDependencies) {
    if (Object.hasOwnProperty.call(packageDependencies, key)) {
      if (!(key in packageList)) {
        getPackageQueue.push({ name: key }, () => {});
      }
    }
  }
  callback && callback();
}

async function getPackage(params, callback) {
  let { name } = params;
  packageInfo = await getPackageInfo(name);
  mapPackage(packageInfo, callback);
}

if (name) {
  getPackageQueue.push({ name }, () => {});
} else {
  console.log('node inxex.js <package name>');
}

function formatPackageData(data, list) {
  const res = {};
  let params = {};
  if ('packageDependencies' in data) {
    params = data.packageDependencies;
  } else {
    params = data;
  }
  for (const key in params) {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      if (typeof params[key] == 'object') {
        res[key] = formatPackageData(list[key].packageDependencies, list);
      } else {
        res[key + "@" +params[key]] = formatPackageData(
          list[key].packageDependencies,
          list
        );
      }
    }
  }
  return res;
}

module.exports = {
  getPackage,
};

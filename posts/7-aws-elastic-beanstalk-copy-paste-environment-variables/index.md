# Copy & Paste Elastic Beanstalk Environment Variables

AWS Elastic Beanstalk has a list of environment variables, which cannot be copied easily when creating a new environment.

These two JavaScript-bookmark snippets help you to easily copy/paste them when looking at the 'Configuration > Software' page.

Copy:

```javascript
javascript:navigator.clipboard.writeText(encodeURIComponent(JSON.stringify(angular.element(document.querySelector('.properties-table')).scope().environmentVariables.collection.reduce((obj, item) => ({ ...obj, [item.optionName]: item.value, }), {}))))
```

Paste:

```javascript
javascript:navigator.clipboard.readText().then(vars => {$env = angular.element(document.querySelector('.properties-table')).scope(); $env.environmentVariables.getKeys().forEach(() => $env.environmentVariables.removeByIndex(0)); $env.$apply(); Object.entries(JSON.parse(decodeURIComponent(vars))).map(([ key, value ]) => $env.environmentVariables.add(key, value)); $env.$apply()});
```
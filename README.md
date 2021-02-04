# Mapeo-SMART integration settings

1. run this to unzip and convert files to mapeo-settings-builder

```sh
node ./bin/index.js <path-to-patrol-package.zip>
```

get some additional logging

```sh
DEBUG=true node ./bin/index.js <path-to-patrol-package.zip>
```

2. check if all the settings are what you want
3. run mapeo-settings-builder to generate a config file
4. import config to mapeo software!

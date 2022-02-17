const {ipcRenderer} = require('electron')
const fs            = require('fs-extra')
const os            = require('os')
const path          = require('path')

const ConfigManager = require('./configmanager')
const DistroManager = require('./distromanager')
const LangLoader    = require('./langloader')
const logger        = require('./loggerutil')('%c[Preloader]', 'color: #a02d2a; font-weight: bold')

logger.log('Loading..')

// Load ConfigManager
ConfigManager.load()

// Load Strings
LangLoader.loadLanguage('en_US')

function onDistroLoad(data){
    if(data != null){
        
        // Resolve the selected server if its value has yet to be set.
        if(ConfigManager.getSelectedServer() == null || data.getServer(ConfigManager.getSelectedServer()) == null){
            logger.log('Determining default selected server..')
            ConfigManager.setSelectedServer(data.getMainServer().getID())
            ConfigManager.save()
        }
    }
    ipcRenderer.send('distributionIndexDone', data != null)
}

// Ensure Distribution is downloaded and cached.
if(!ConfigManager.getKeepMods){
    DistroManager.pullRemote().then((data) => {
        logger.log('Loaded distribution index.')

        onDistroLoad(data)

    }).catch((err) => {
        logger.log('Failed to load distribution index.')
        logger.error(err)

        logger.log('Attempting to load an older version of the distribution index.')
        // Try getting a local copy, better than nothing.
        DistroManager.pullLocal().then((data) => {
            logger.log('Successfully loaded an older version of the distribution index.')

            onDistroLoad(data)


        }).catch((err) => {

            logger.log('Failed to load an older version of the distribution index.')
            logger.log('Application cannot run.')
            logger.error(err)

            onDistroLoad(null)

        })

    })
} else {
    DistroManager.pullLocal().then((data) => {
            logger.log('Successfully loaded the distribution index from disk.')

            onDistroLoad(data)


        }).catch((err) => {

            logger.log('Failed to load the distribution index.')
            logger.log('Application cannot run.')
            logger.error(err)

            onDistroLoad(null)

        })
}

// Clean up temp dir incase previous launches ended unexpectedly. 
fs.remove(path.join(os.tmpdir(), ConfigManager.getTempNativeFolder()), (err) => {
    if(err){
        logger.warn('Error while cleaning natives directory', err)
    } else {
        logger.log('Cleaned natives directory.')
    }
})

//Clean up mods incase they weren't removed after the game closed, allowing for constant updating
if(!ConfigManager.getKeepMods){
    fs.remove(path.join(ConfigManager.getCommonDirectory(), 'modstore', ), (err) => {
        if(err){
            logger.warn('Couldn\'t remove stored Mods to allow for constant updating every launch')
        } else {
            logger.log('Successfully checked for a clean mods Folder')
        }
    })
}

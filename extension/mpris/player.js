import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

export class MprisPlayer {
    constructor() {
        this._bus = Gio.bus_get_sync(
            Gio.BusType.SESSION,
            null
        );

        this._playerName = null;
    }

    findPlayer() {
        const result = this._bus.call_sync(
            'org.freedesktop.DBus',
            '/org/freedesktop/DBus',
            'org.freedesktop.DBus',
            'ListNames',
            null,
            null,
            Gio.DBusCallFlags.NONE,
            -1,
            null
        );

        const names = result.deep_unpack()[0];

        for (const name of names) {
            if (name.startsWith('org.mpris.MediaPlayer2.')) {
                this._playerName = name;
                break;
            }
        }

        return this._playerName;
    }

    getProperty(interfaceName, propertyName) {
        if (!this._playerName)
            return null;

        const result = this._bus.call_sync(
            this._playerName,
            '/org/mpris/MediaPlayer2',
            'org.freedesktop.DBus.Properties',
            'Get',
            new GLib.Variant(
                '(ss)',
                [interfaceName, propertyName]
            ),
            null,
            Gio.DBusCallFlags.NONE,
            -1,
            null
        );

        const variant = result.deep_unpack()[0];

        return variant.deep_unpack();
    }
	getMetadata() {
 	   const metadata = this.getProperty(
       	 'org.mpris.MediaPlayer2.Player',
      	  'Metadata'
   	 );

   	 if (!metadata)
      	  return null;

  	  const result = {};

  	  for (const [key, value] of Object.entries(metadata)) {
       		 try {
        	    result[key] = value.deep_unpack();
      		  } catch (error) {
           	 result[key] = value;
       		 }
   	 }

   	 return result;
	}

    getPlaybackStatus() {
        return this.getProperty(
            'org.mpris.MediaPlayer2.Player',
            'PlaybackStatus'
        );
    }

    getPosition() {
        return this.getProperty(
            'org.mpris.MediaPlayer2.Player',
            'Position'
        );
    }

    playPause() {
        if (!this._playerName)
            return;

        this._bus.call_sync(
            this._playerName,
            '/org/mpris/MediaPlayer2',
            'org.mpris.MediaPlayer2.Player',
            'PlayPause',
            null,
            null,
            Gio.DBusCallFlags.NONE,
            -1,
            null
        );
    }

    previous() {
        if (!this._playerName)
            return;

        this._bus.call_sync(
            this._playerName,
            '/org/mpris/MediaPlayer2',
            'org.mpris.MediaPlayer2.Player',
            'Previous',
            null,
            null,
            Gio.DBusCallFlags.NONE,
            -1,
            null
        );
    }

    next() {
        if (!this._playerName)
            return;

        this._bus.call_sync(
            this._playerName,
            '/org/mpris/MediaPlayer2',
            'org.mpris.MediaPlayer2.Player',
            'Next',
            null,
            null,
            Gio.DBusCallFlags.NONE,
            -1,
            null
        );
    }

    destroy() {
        this._bus = null;
        this._playerName = null;
    }
}

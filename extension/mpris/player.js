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

    _getPropertyForPlayer(playerName, interfaceName, propertyName) {
        if (!playerName)
            return null;

        try {
            const result = this._bus.call_sync(
                playerName,
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
        } catch (error) {
            return null;
        }
    }

    _getPlayerIcon(desktopEntry) {
        if (!desktopEntry)
            return null;

        try {
            const desktopFile = desktopEntry.endsWith('.desktop')
                ? desktopEntry
                : `${desktopEntry}.desktop`;

            const appInfo =
                Gio.DesktopAppInfo.new(desktopFile);

            if (appInfo)
                return appInfo.get_icon();
        } catch (error) {
            logError(error, 'Music Player icon error');
        }

        return null;
    }

    getPlayers() {
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

        const players = [];

        for (const name of names) {
            if (!name.startsWith('org.mpris.MediaPlayer2.'))
                continue;

            try {
                const identity =
                    this._getPropertyForPlayer(
                        name,
                        'org.mpris.MediaPlayer2',
                        'Identity'
                    );

                const desktopEntry =
                    this._getPropertyForPlayer(
                        name,
                        'org.mpris.MediaPlayer2',
                        'DesktopEntry'
                    );

                const status =
                    this._getPropertyForPlayer(
                        name,
                        'org.mpris.MediaPlayer2.Player',
                        'PlaybackStatus'
                    );

                players.push({
                    name,
                    identity: identity || name,
                    desktopEntry: desktopEntry || null,
                    status: status || 'Stopped',
                    icon: this._getPlayerIcon(desktopEntry),
                });
            } catch (error) {
                logError(
                    error,
                    `Music Player discovery error: ${name}`
                );
            }
        }

        return players;
    }

    findPlayer() {
        const players = this.getPlayers();

        if (players.length === 0) {
            this._playerName = null;
            return null;
        }

        // Keep the user's selected player if it still exists.
        if (
            this._playerName &&
            players.some(player =>
                player.name === this._playerName)
        ) {
            return this._playerName;
        }

        // Otherwise prefer a currently playing player.
        const playingPlayer =
            players.find(player =>
                player.status === 'Playing');

        if (playingPlayer) {
            this._playerName = playingPlayer.name;
        } else {
            this._playerName = players[0].name;
        }

        return this._playerName;
    }

    selectPlayer(playerName) {
        const players = this.getPlayers();

        const player = players.find(
            item => item.name === playerName
        );

        if (!player)
            return false;

        this._playerName = playerName;

        return true;
    }

    getCurrentPlayer() {
        if (!this._playerName)
            this.findPlayer();

        if (!this._playerName)
            return null;

        const players = this.getPlayers();

        return players.find(
            player => player.name === this._playerName
        ) || null;
    }

    getProperty(interfaceName, propertyName) {
        return this._getPropertyForPlayer(
            this._playerName,
            interfaceName,
            propertyName
        );
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

    _callPlayerMethod(methodName) {
        if (!this._playerName)
            return;

        this._bus.call_sync(
            this._playerName,
            '/org/mpris/MediaPlayer2',
            'org.mpris.MediaPlayer2.Player',
            methodName,
            null,
            null,
            Gio.DBusCallFlags.NONE,
            -1,
            null
        );
    }

    playPause() {
        this._callPlayerMethod('PlayPause');
    }

    previous() {
        this._callPlayerMethod('Previous');
    }

    next() {
        this._callPlayerMethod('Next');
    }

	setPosition(trackId, position) {
    		if (!this._playerName || !trackId)
        	return;

    	try {
        	this._bus.call_sync(
            	this._playerName,
            	'/org/mpris/MediaPlayer2',
            	'org.mpris.MediaPlayer2.Player',
            	'SetPosition',
            new GLib.Variant(
                '(ox)',
                [
                    trackId,
                    BigInt(Math.round(position))
                ]
            ),
            null,
            Gio.DBusCallFlags.NONE,
            -1,
            null
        	);
    	} catch (error) {
        	logError(
            	error,
            	'Music Player seek error'
        	);
    		}
	}

    destroy() {
        this._bus = null;
        this._playerName = null;
    }
}


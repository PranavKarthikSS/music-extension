import St from 'gi://St';
import GObject from 'gi://GObject';
import GLib from 'gi://GLib';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { MprisPlayer } from './mpris/player.js';


const MusicIndicator = GObject.registerClass(
class MusicIndicator extends PanelMenu.Button {

    _init() {
        super._init(0.0, 'Music Player');

        this._mpris = new MprisPlayer();

        this._icon = new St.Icon({
            icon_name: 'audio-x-generic-symbolic',
            style_class: 'system-status-icon'
        });

        this.add_child(this._icon);

        this._titleItem = new PopupMenu.PopupMenuItem(
            'Music Player'
        );

        this._titleItem.reactive = false;

        this._statusItem = new PopupMenu.PopupMenuItem(
            'No music playing'
        );

        this._statusItem.reactive = false;

        this.menu.addMenuItem(this._titleItem);

        this.menu.addMenuItem(
            new PopupMenu.PopupSeparatorMenuItem()
        );

        this.menu.addMenuItem(this._statusItem);

        this._playPauseItem =
            new PopupMenu.PopupMenuItem('▶  Play / Pause');

        this._playPauseItem.connect('activate', () => {
            try {
                this._mpris.playPause();
        GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            if (!this.menu.isOpen)
                this.menu.open();

            return GLib.SOURCE_REMOVE;
        });
            } catch (error) {
                logError(error, 'Music Player PlayPause error');
            }
        });

        this.menu.addMenuItem(this._playPauseItem);

        this._previousItem =
            new PopupMenu.PopupMenuItem('⏮  Previous');

        this._previousItem.connect('activate', () => {
            try {
                this._mpris.previous();
        GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            if (!this.menu.isOpen)
                this.menu.open();

            return GLib.SOURCE_REMOVE;
        });
            } catch (error) {
                logError(error, 'Music Player Previous error');
            }
        });

        this.menu.addMenuItem(this._previousItem);


        this._nextItem =
            new PopupMenu.PopupMenuItem('⏭  Next');

        this._nextItem.connect('activate', () => {
            try {
                this._mpris.next();
        GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            if (!this.menu.isOpen)
                this.menu.open();

            return GLib.SOURCE_REMOVE;
        });
            } catch (error) {
                logError(error, 'Music Player Next error');
            }
        });

        this.menu.addMenuItem(this._nextItem);

        this._updatePlayer();

        this._updateTimer = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            2,
            () => {
                this._updatePlayer();
                return GLib.SOURCE_CONTINUE;
            }
        );
    }

    _updatePlayer() {
        try {
            if (!this._mpris.findPlayer()) {
                this._statusItem.label.text = 'No music player detected';
                return;
            }

            const status =
                this._mpris.getPlaybackStatus();

            const metadata =
                this._mpris.getMetadata();

            if (!metadata) {
                this._statusItem.label.text = 'No music playing';
                return;
            }
		const title =
   		 metadata['xesam:title'] || 'Unknown title';

		const artists =
    		metadata['xesam:artist'];

		const artist =
    		Array.isArray(artists)
        	? artists.join(', ')
        	: artists || 'Unknown artist';

            this._statusItem.label.text =
                `${title}\n${artist}\n\n${status}`;
        } catch (error) {
            logError(error, 'Music Player MPRIS error');
        }
    }

    destroy() {
        if (this._updateTimer) {
            GLib.source_remove(this._updateTimer);
            this._updateTimer = null;
        }

        this._mpris?.destroy();
        this._mpris = null;

        super.destroy();
    }
});


export default class MusicPlayerExtension {

    enable() {
        this._indicator = new MusicIndicator();

        Main.panel.addToStatusArea(
            'music-player',
            this._indicator
        );
    }

    disable() {
        this._indicator?.destroy();
        this._indicator = null;
    }
}

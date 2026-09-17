import St from 'gi://St';
import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { MprisPlayer } from './mpris/player.js';


const MusicIndicator = GObject.registerClass(
class MusicIndicator extends PanelMenu.Button {

    _init() {
        super._init(0.0, 'Music Player');

        this._mpris = new MprisPlayer();

        // Top bar icon
        this._icon = new St.Icon({
            icon_name: 'audio-x-generic-symbolic',
            style_class: 'system-status-icon'
        });

        this.add_child(this._icon);


        // -----------------------------
        // TITLE
        // -----------------------------

        this._titleItem =
            new PopupMenu.PopupMenuItem('Music Player');

        this._titleItem.reactive = false;

        this.menu.addMenuItem(this._titleItem);


        this.menu.addMenuItem(
            new PopupMenu.PopupSeparatorMenuItem()
        );


        // -----------------------------
        // SONG INFORMATION
        // -----------------------------

        this._statusItem =
            new PopupMenu.PopupMenuItem(
                'No music playing'
            );

this._statusItem.reactive = false;

	this.menu.addMenuItem(this._statusItem);

	this._progressItem = new PopupMenu.PopupBaseMenuItem({
    		reactive: false,
    		can_focus: false,
	});

	this._progressTrack = new St.Widget({
    		style_class: 'music-progress-track',
		    reactive: true,
	});

	this._progressBar = new St.Widget({
    		style_class: 'music-progress-fill',
	});

	this._progressBar.set_width(0);

	this._progressTrack.add_child(this._progressBar);

	this._progressItem.add_child(this._progressTrack);

	this._progressTrack.connect(
    		'button-press-event',
    		(actor, event) => {
        	try {
            		const [stageX] =
                	event.get_coords();

            	const [
                	trackX,
            	] = actor.get_transformed_position();

            const width =
                actor.get_width();

            if (width <= 0)
                return Clutter.EVENT_STOP;

            const clickX =
                stageX - trackX;

            const fraction =
                Math.min(
                    Math.max(
                        clickX / width,
                        0
                    ),
                    1
                );

            this._seekToFraction(fraction);

        } catch (error) {
            logError(
                error,
                'Music Player seek UI error'
            	);
        	}

        	return Clutter.EVENT_STOP;
    		}
	);

	this._timeItem = new PopupMenu.PopupMenuItem(
    		'0:00 / 0:00'
	);

	this._timeItem.reactive = false;

	// Add progress elements AFTER creating them
	this.menu.addMenuItem(this._progressItem);
	this.menu.addMenuItem(this._timeItem);
        // -----------------------------
        // PLAY / PAUSE
        // -----------------------------

        this._playPauseItem =
            new PopupMenu.PopupMenuItem(
                '▶  Play / Pause'
            );

        this._playPauseItem.connect(
            'activate',
            () => {
                try {
                    this._mpris.playPause();

                    this._keepMenuOpen();
                } catch (error) {
                    logError(
                        error,
                        'Music Player PlayPause error'
                    );
                }
            }
        );

        this.menu.addMenuItem(
            this._playPauseItem
        );


        // -----------------------------
        // PREVIOUS
        // -----------------------------

        this._previousItem =
            new PopupMenu.PopupMenuItem(
                '⏮  Previous'
            );

        this._previousItem.connect(
            'activate',
            () => {
                try {
                    this._mpris.previous();

                    this._keepMenuOpen();
                } catch (error) {
                    logError(
                        error,
                        'Music Player Previous error'
                    );
                }
            }
        );

        this.menu.addMenuItem(
            this._previousItem
        );


        // -----------------------------
        // NEXT
        // -----------------------------

        this._nextItem =
            new PopupMenu.PopupMenuItem(
                '⏭  Next'
            );

        this._nextItem.connect(
            'activate',
            () => {
                try {
                    this._mpris.next();

                    this._keepMenuOpen();
                } catch (error) {
                    logError(
                        error,
                        'Music Player Next error'
                    );
                }
            }
        );

        this.menu.addMenuItem(
            this._nextItem
        );


        // -----------------------------
        // PLAYER SELECTOR
        // -----------------------------

        this.menu.addMenuItem(
            new PopupMenu.PopupSeparatorMenuItem()
        );

        this._playerSelector =
            new PopupMenu.PopupSubMenuMenuItem(
                'No player',
                true
            );

        this._playerSelector.icon.icon_name =
            'audio-x-generic-symbolic';

        this.menu.addMenuItem(
            this._playerSelector
        );


        // Build initial player list
        this._updatePlayerSelector();

        // Update player information
        this._updatePlayer();

        this._updateTimer =
            GLib.timeout_add_seconds(
                GLib.PRIORITY_DEFAULT,
                2,
                () => {
                    this._updatePlayer();
                    this._updatePlayerSelector();

                    return GLib.SOURCE_CONTINUE;
                }
            );
    }


    // Keep the main popup open after playback controls.
    _keepMenuOpen() {
        GLib.idle_add(
            GLib.PRIORITY_DEFAULT_IDLE,
            () => {

                if (!this.menu.isOpen)
                    this.menu.open();

                return GLib.SOURCE_REMOVE;
            }
        );
    }


    // -----------------------------
    // PLAYER SELECTOR
    // -----------------------------

    _updatePlayerSelector() {
        try {
            const players =
                this._mpris.getPlayers();

            const current =
                this._mpris.getCurrentPlayer();

            if (!players.length) {

                this._playerSelector.label.text =
                    'No player';

                this._playerSelector.icon.icon_name =
                    'audio-x-generic-symbolic';

                this._playerSelector.menu.removeAll();

                const item =
                    new PopupMenu.PopupMenuItem(
                        'No MPRIS players found'
                    );

                item.reactive = false;

                this._playerSelector.menu.addMenuItem(
                    item
                );

                return;
            }


            // Current player label
            this._playerSelector.label.text =
                current
                    ? current.identity
                    : 'Select player';


            // Current player icon
            if (current?.icon) {
                this._playerSelector.icon.gicon =
                    current.icon;
            } else {
                this._playerSelector.icon.icon_name =
                    'audio-x-generic-symbolic';
            }


            // Rebuild submenu
            this._playerSelector.menu.removeAll();


            for (const player of players) {

                const item =
                    new PopupMenu.PopupImageMenuItem(
                        player.identity,
                        player.icon ||
                        'audio-x-generic-symbolic',
                        {}
                    );


                // Show check mark for selected player
                if (
                    current &&
                    player.name === current.name
                ) {
                    item.setOrnament(
                        PopupMenu.Ornament.CHECK
                    );
                }


                item.connect(
                    'activate',
                    () => {

                        if (
                            this._mpris.selectPlayer(
                                player.name
                            )
                        ) {

                            this._updatePlayer();
                            this._updatePlayerSelector();

                            // Keep main popup open
                            this._keepMenuOpen();
                        }
                    }
                );


                this._playerSelector.menu.addMenuItem(
                    item
                );
            }

        } catch (error) {
            logError(
                error,
                'Music Player selector error'
            );
        }
    }


    // -----------------------------
    // MUSIC INFORMATION
    // -----------------------------

_seekToFraction(fraction) {
    try {
        const metadata =
            this._mpris.getMetadata();

        if (!metadata)
            return;

        const duration =
            Number(
                metadata['mpris:length'] || 0
            );

        const trackId =
            metadata['mpris:trackid'];

        if (
            duration <= 0 ||
            !trackId
        )
            return;

        const position =
            duration * fraction;

        this._mpris.setPosition(
            trackId,
            position
        );

        // Update UI immediately
        this._progressBar.set_width(
            180 * fraction
        );

        this._timeItem.label.text =
            `${this._formatTime(position / 1000000)} / ${this._formatTime(duration / 1000000)}`;

        this._keepMenuOpen();

    } catch (error) {
        logError(
            error,
            'Music Player seek error'
        );
    }
}

	_updatePlayer() {
    try {
        if (!this._mpris.findPlayer()) {
            this._statusItem.label.text =
                'No music player detected';

            this._progressBar.set_width(0);
            this._timeItem.label.text =
                '0:00 / 0:00';

            return;
        }

        const status =
            this._mpris.getPlaybackStatus();

        const metadata =
            this._mpris.getMetadata();

        if (!metadata) {
            this._statusItem.label.text =
                'No music playing';

            this._progressBar.set_width(0);
            this._timeItem.label.text =
                '0:00 / 0:00';

            return;
        }

        // Song title
        const title =
            metadata['xesam:title'] ||
            'Unknown title';

        // Artist
        const artists =
            metadata['xesam:artist'];

        const artist =
            Array.isArray(artists)
                ? artists.join(', ')
                : artists || 'Unknown artist';

        // Update song information
        this._statusItem.label.text =
            `${title}\n${artist}\n\n${status}`;

        // Track duration in microseconds
        const duration =
            Number(metadata['mpris:length'] || 0);

        // Current position in microseconds
        const position =
            Number(this._mpris.getPosition() || 0);

        // Convert microseconds → seconds
        const durationSeconds =
            duration / 1000000;

        const positionSeconds =
            position / 1000000;

        // Calculate progress
        if (durationSeconds > 0) {
            const fraction =
                Math.min(
                    Math.max(
                        positionSeconds / durationSeconds,
                        0
                    ),
                    1
                );

             this._progressBar.set_width(
       			 180 * fraction
        	);
        } else {
            this._progressBar.set_width(0);
        }

        // Update time display
        this._timeItem.label.text =
            `${this._formatTime(positionSeconds)} / ${this._formatTime(durationSeconds)}`;

    } catch (error) {
        logError(
            error,
            'Music Player MPRIS error'
        );
    }
}

    // -----------------------------
    // CLEANUP
    // -----------------------------
	_formatTime(seconds) {
    		if (!Number.isFinite(seconds) || seconds < 0)
        	return '0:00';

    		seconds = Math.floor(seconds);

    		const minutes =
        	Math.floor(seconds / 60);

    		const remainingSeconds =
        	seconds % 60;

    		return `${minutes}:${remainingSeconds
        	.toString()
        	.padStart(2, '0')}`;
	}

    destroy() {

        if (this._updateTimer) {

            GLib.source_remove(
                this._updateTimer
            );

            this._updateTimer = null;
        }


        this._mpris?.destroy();

        this._mpris = null;


        super.destroy();
    }
});


export default class MusicPlayerExtension {

    enable() {

        this._indicator =
            new MusicIndicator();


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

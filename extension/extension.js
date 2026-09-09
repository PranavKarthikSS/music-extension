import St from 'gi://St';
import GObject from 'gi://GObject';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

const MusicIndicator = GObject.registerClass(
class MusicIndicator extends PanelMenu.Button {
    _init() {
        super._init(0.0, 'Music Player');

        this._icon = new St.Icon({
            icon_name: 'audio-x-generic-symbolic',
            style_class: 'system-status-icon'
        });

        this.add_child(this._icon);

        const titleItem = new PopupMenu.PopupMenuItem('Music Player');
        titleItem.reactive = false;

        const statusItem = new PopupMenu.PopupMenuItem('No music playing');
        statusItem.reactive = false;

        this.menu.addMenuItem(titleItem);
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this.menu.addMenuItem(statusItem);
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

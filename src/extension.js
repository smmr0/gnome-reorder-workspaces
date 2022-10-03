/*
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

const { Gio, Meta, Shell } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;

class ReorderWorkspaces {
	constructor() {
		this.settings = ExtensionUtils.getSettings();
		this.mutterSettings = new Gio.Settings({ schema_id: 'org.gnome.mutter' });
		this.wmPreferencesSettings = new Gio.Settings({ schema_id: 'org.gnome.desktop.wm.preferences' });

		this.overviewConnections = {
			'showing': { callback: this.enableKeybindings.bind(this) },
			'hiding': { callback: this.disableKeybindings.bind(this) }
		};
		this.keybindings = {
			'move-workspace-prev': { distance: -1 },
			'move-workspace-next': { distance: 1 }
		};
	}

	enable() {
		this.connectToOverview();
		if (Main.overview._visible) { this.enableKeybindings(); }
	}

	disable() {
		this.disableKeybindings();
		this.disconnectFromOverview();
	}

	connectToOverview() {
		for (const overviewConnectionName in this.overviewConnections) {
			const overviewConnection = this.overviewConnections[overviewConnectionName];

			overviewConnection.id =
				Main.overview.connect(overviewConnectionName, overviewConnection.callback);
		}
	}

	disconnectFromOverview() {
		Object.values(this.overviewConnections)
			.map(oc => oc.id)
			.filter(id => id !== undefined)
			.forEach(id => Main.overview.disconnect(id));
	}

	enableKeybindings() {
		for (const keybindingName in this.keybindings) {
			const keybinding = this.keybindings[keybindingName];

			Main.wm.addKeybinding(
				keybindingName,
				this.settings,
				Meta.KeyBindingFlags.NONE,
				Shell.ActionMode.OVERVIEW,
				this.moveWorkspace.bind(this, keybinding.distance)
			);
		}
	}

	disableKeybindings() {
		for (const keybindingName in this.keybindings) {
			Main.wm.removeKeybinding(keybindingName);
		}
	}

	moveWorkspace(distance) {
		const activeWorkspace = global.workspace_manager.get_active_workspace();

		if (this.workspaceIsEmptyDynamic(activeWorkspace)) {
			return;
		}

		const currentIndex = activeWorkspace.index();
		const newIndex = currentIndex + distance;
		const workspaceAtNewIndex = global.workspace_manager.get_workspace_by_index(newIndex);

		if (workspaceAtNewIndex === null || this.workspaceIsEmptyDynamic(workspaceAtNewIndex)) {
			return;
		}

		let workspaceNames = this.wmPreferencesSettings.get_strv('workspace-names');
		workspaceNames.length = Math.max(workspaceNames.length, currentIndex + 1, newIndex + 1);
		const [activeWorkspaceName] = workspaceNames.splice(currentIndex, 1);
		workspaceNames.splice(newIndex, 0, activeWorkspaceName);
		workspaceNames = [...workspaceNames].map(wn => wn === undefined ? '' : wn);
		for (let i = workspaceNames.length - 1; i >= 0; i--) {
			if (workspaceNames[i] !== '') {
				workspaceNames.length = i + 1;
				break;
			}
		}

		global.workspace_manager.reorder_workspace(activeWorkspace, newIndex);
		this.wmPreferencesSettings.set_strv('workspace-names', workspaceNames);
	}

	workspaceIsEmptyDynamic(workspace) {
		return this.mutterSettings.get_boolean('dynamic-workspaces') &&
			workspace.index() === global.workspace_manager.get_n_workspaces() - 1 &&
			!workspace.list_windows().some(w => !w.on_all_workspaces);
	}
}

function init() { // eslint-disable-line no-unused-vars
	return new ReorderWorkspaces();
}

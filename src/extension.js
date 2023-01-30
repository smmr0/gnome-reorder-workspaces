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

const { Meta, Shell } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;

class ReorderWorkspaces {
	enable() {
		this.settings = {
			self: ExtensionUtils.getSettings(),
			mutter: ExtensionUtils.getSettings('org.gnome.mutter'),
			wmPreferences: ExtensionUtils.getSettings('org.gnome.desktop.wm.preferences')
		};
		this.overviewConnections = {
			'showing': { callback: this.enableKeybindings.bind(this) },
			'hiding': { callback: this.disableKeybindings.bind(this) }
		};
		this.keybindings = {
			'move-workspace-prev': { callback: this.moveWorkspace.bind(this, -1) },
			'move-workspace-next': { callback: this.moveWorkspace.bind(this, 1) }
		};

		this.connectToOverview();
		if (Main.overview._visible) { this.enableKeybindings(); }
	}

	disable() {
		this.disconnectFromOverview();
		this.disableKeybindings();

		this.keybindings = null;
		this.overviewConnections = null;
		this.settings = null;
	}

	connectToOverview() {
		for (const [name, connection] of Object.entries(this.overviewConnections)) {
			connection.id = Main.overview.connect(name, connection.callback);
		}
	}

	disconnectFromOverview() {
		for (const [_name, connection] of Object.entries(this.overviewConnections)) {
			if (!connection.id) { return; }

			Main.overview.disconnect(connection.id);
			delete connection.id;
		}
	}

	enableKeybindings() {
		for (const [name, keybinding] of Object.entries(this.keybindings)) {
			Main.wm.addKeybinding(
				name,
				this.settings.self,
				Meta.KeyBindingFlags.NONE,
				Shell.ActionMode.OVERVIEW,
				keybinding.callback
			);
		}
	}

	disableKeybindings() {
		for (const [name, _keybinding] of Object.entries(this.keybindings)) {
			Main.wm.removeKeybinding(name);
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

		let workspaceNames = this.settings.wmPreferences.get_strv('workspace-names');
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
		this.settings.wmPreferences.set_strv('workspace-names', workspaceNames);
	}

	workspaceIsEmptyDynamic(workspace) {
		return this.settings.mutter.get_boolean('dynamic-workspaces') &&
			workspace.index() === global.workspace_manager.get_n_workspaces() - 1 &&
			!workspace.list_windows().some(w => !w.on_all_workspaces);
	}
}

function init() { // eslint-disable-line no-unused-vars
	return new ReorderWorkspaces();
}

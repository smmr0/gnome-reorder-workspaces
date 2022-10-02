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

let overviewConnections,
	keybindings,
	mutterSettings;

function init() { // eslint-disable-line no-unused-vars
	overviewConnections = {
		'showing': { callback: enableKeybindings.bind(this) },
		'hiding': { callback: disableKeybindings.bind(this) }
	};
	keybindings = {
		'move-workspace-prev': { distance: -1 },
		'move-workspace-next': { distance: 1 }
	};
	mutterSettings = new Gio.Settings({ schema_id: 'org.gnome.mutter' });
}

function enable() { // eslint-disable-line no-unused-vars
	connectToOverview();
	if (Main.overview._visible) { enableKeybindings(); }
}

function disable() { // eslint-disable-line no-unused-vars
	disableKeybindings();
	disconnectFromOverview();
}

function connectToOverview() {
	for (const overviewConnectionName in overviewConnections) {
		const overviewConnection = overviewConnections[overviewConnectionName];

		overviewConnection.id =
			Main.overview.connect(overviewConnectionName, overviewConnection.callback);
	}
}

function disconnectFromOverview() {
	overviewConnections
		.map(oc => oc.id)
		.filter(id => id !== undefined)
		.forEach(id => Main.overview.disconnect(id));
}

function enableKeybindings() {
	const settings = ExtensionUtils.getSettings();

	for (const keybindingName in keybindings) {
		const keybinding = keybindings[keybindingName];

		Main.wm.addKeybinding(
			keybindingName,
			settings,
			Meta.KeyBindingFlags.NONE,
			Shell.ActionMode.OVERVIEW,
			moveWorkspace.bind(this, keybinding.distance)
		);
	}
}

function disableKeybindings() {
	for (const keybindingName in keybindings) {
		Main.wm.removeKeybinding(keybindingName);
	}
}

function moveWorkspace(distance) {
	const activeWorkspace = global.workspace_manager.get_active_workspace();

	if (workspaceIsEmptyDynamic(activeWorkspace)) {
		return;
	}

	const currentIndex = activeWorkspace.index();
	const newIndex = currentIndex + distance;
	const workspaceAtNewIndex = global.workspace_manager.get_workspace_by_index(newIndex);

	if (workspaceAtNewIndex === null || workspaceIsEmptyDynamic(workspaceAtNewIndex)) {
		return;
	}

	global.workspace_manager.reorder_workspace(activeWorkspace, newIndex);
}

function workspaceIsEmptyDynamic(workspace) {
	return mutterSettings.get_boolean('dynamic-workspaces') &&
		workspace.index() === global.workspace_manager.get_n_workspaces() - 1 &&
		!workspace.list_windows().some(w => !w.on_all_workspaces);
}

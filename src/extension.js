// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

/* global global */

import Meta from 'gi://Meta'
import Shell from 'gi://Shell'
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js'
import * as Main from 'resource:///org/gnome/shell/ui/main.js'
import { WorkspaceSwitcherPopup } from 'resource:///org/gnome/shell/ui/workspaceSwitcherPopup.js'

export default class ReorderWorkspaces extends Extension {
	enable() {
		this.settings = {
			self: this.getSettings(),
			mutter: this.getSettings('org.gnome.mutter'),
			wmPreferences: this.getSettings('org.gnome.desktop.wm.preferences'),
		}
		this.overviewConnections = {
			showing: { callback: this.enableKeybindings.bind(this) },
			hiding: { callback: this.disableKeybindings.bind(this) },
		}
		this.keybindings = {
			'move-workspace-prev': { callback: this.moveWorkspace.bind(this, -1) },
			'move-workspace-next': { callback: this.moveWorkspace.bind(this, 1) },
		}

		this.setUpKeybindings({ reset: false })
		this.settingsChangedConnectionId =
			this.settings.self.connect('changed', () => {
				this.setUpKeybindings({ reset: true })
			})
	}

	disable() {
		this.settings.self.disconnect(this.settingsChangedConnectionId)

		this.disconnectFromOverview()
		this.disableKeybindings()

		if (this.workspaceSwitcherPopup) {
			this.workspaceSwitcherPopup.destroy()
		}
		this.workspaceSwitcherPopup = null

		this.keybindings = null
		this.overviewConnections = null
		this.settings = null
	}

	setUpKeybindings({ reset }) {
		this.keybindingBehaviorOutsideOfOverview =
			this.settings.self.get_string('keybinding-behavior-outside-of-overview')

		if (this.keybindingBehaviorOutsideOfOverview === 'default') {
			this.connectToOverview()
		} else if (reset) {
			this.disconnectFromOverview()
		}

		if (reset) {
			this.disableKeybindings()
		}
		if (
			['reorder', 'disabled'].includes(this.keybindingBehaviorOutsideOfOverview)
			|| Main.actionMode === Shell.ActionMode.OVERVIEW
		) {
			this.enableKeybindings()
		}
	}

	connectToOverview() {
		for (const [name, connection] of Object.entries(this.overviewConnections)) {
			if (connection.id) {
				return
			}

			connection.id = Main.overview.connect(name, connection.callback)
		}
	}

	disconnectFromOverview() {
		for (const [_name, connection] of Object.entries(this.overviewConnections)) {
			if (!connection.id) {
				return
			}

			Main.overview.disconnect(connection.id)
			delete connection.id
		}
	}

	enableKeybindings() {
		let actionMode
		switch (this.keybindingBehaviorOutsideOfOverview) {
			case 'reorder':
				actionMode = Shell.ActionMode.ALL
				break
			case 'default':
			case 'disabled':
			default:
				actionMode = Shell.ActionMode.OVERVIEW
		}

		for (const [name, keybinding] of Object.entries(this.keybindings)) {
			Main.wm.addKeybinding(
				name,
				this.settings.self,
				Meta.KeyBindingFlags.NONE,
				actionMode,
				keybinding.callback,
			)
		}
	}

	disableKeybindings() {
		for (const [name, _keybinding] of Object.entries(this.keybindings)) {
			Main.wm.removeKeybinding(name)
		}
	}

	moveWorkspace(distance) {
		const activeWorkspace = global.workspace_manager.get_active_workspace()

		if (this.workspaceIsEmptyDynamic(activeWorkspace)) {
			return
		}

		const currentIndex = activeWorkspace.index()
		const newIndex = currentIndex + distance
		const workspaceAtNewIndex = global.workspace_manager.get_workspace_by_index(newIndex)

		if (workspaceAtNewIndex === null || this.workspaceIsEmptyDynamic(workspaceAtNewIndex)) {
			return
		}

		this.reorderWorkspaceNames({ currentIndex, newIndex, activeWorkspace })

		this.showWorkspaceSwitcherPopup(newIndex)
	}

	reorderWorkspaceNames({ currentIndex, newIndex, activeWorkspace }) {
		const currentWorkspaceNames = this.settings.wmPreferences.get_strv('workspace-names')

		let newWorkspaceNames = [...currentWorkspaceNames]
		newWorkspaceNames.length = Math.max(newWorkspaceNames.length, currentIndex + 1, newIndex + 1)
		const [activeWorkspaceName] = newWorkspaceNames.splice(currentIndex, 1)
		newWorkspaceNames.splice(newIndex, 0, activeWorkspaceName)
		newWorkspaceNames = [...newWorkspaceNames].map(wn => (wn === undefined ? '' : wn))

		const lastNamedWorkspaceIndex =
			newWorkspaceNames.findLastIndex(workspaceName => workspaceName !== '')
		newWorkspaceNames.length = lastNamedWorkspaceIndex + 1 // Clamp to >= 0

		this.setWorkspaceNames({
			currentWorkspaceNames,
			newWorkspaceNames,
			activeWorkspace,
			newIndex,
		})
	}

	setWorkspaceNames({
		currentWorkspaceNames,
		newWorkspaceNames,
		activeWorkspace,
		newIndex,
	}) {
		this.settings.wmPreferences.set_strv('workspace-names', newWorkspaceNames)
		try {
			global.workspace_manager.reorder_workspace(activeWorkspace, newIndex)
			this.settings.wmPreferences.set_strv('workspace-names', newWorkspaceNames)
		} catch (err) {
			this.settings.wmPreferences.set_strv('workspace-names', currentWorkspaceNames)
			throw err
		}
	}

	workspaceIsEmptyDynamic(workspace) {
		return this.settings.mutter.get_boolean('dynamic-workspaces')
			&& workspace.index() === global.workspace_manager.get_n_workspaces() - 1
			&& !workspace.list_windows().some(win => !win.on_all_workspaces)
	}

	showWorkspaceSwitcherPopup(index) {
		if (Main.actionMode === Shell.ActionMode.OVERVIEW) {
			return
		}

		if (!this.workspaceSwitcherPopup) {
			this.workspaceSwitcherPopup = new WorkspaceSwitcherPopup
			this.workspaceSwitcherPopup.connect('destroy', () => {
				this.workspaceSwitcherPopup = null
			})
		}
		this.workspaceSwitcherPopup.display(index)
	}
}

function init() { // eslint-disable-line no-unused-vars
	return new ReorderWorkspaces
}

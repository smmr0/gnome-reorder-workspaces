const { Adw, GLib, GObject, Gtk } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;

function init() {} // eslint-disable-line no-unused-vars

function fillPreferencesWindow(window) { // eslint-disable-line no-unused-vars
	const page = new Adw.PreferencesPage();
	const group = new Adw.PreferencesGroup();
	page.add(group);

	for (dir of ['prev', 'next']) {
		group.add(accelRow(`move-workspace-${dir}`));
	}
	group.add(keybindingBehaviorOutsideOfOverviewRow());

	window.add(page);
}

// https://github.com/atareao/translate-assistant/blob/d38e562ce07c2658ecb4fe45c39dbddaecdbd23c/preferenceswidget.js#L35-L76
function accelRow(settingsKeyName) {
	const settings = ExtensionUtils.getSettings();
	const settingsKey = settings.settings_schema.get_key(settingsKeyName);

	const model = new Gtk.ListStore();
	model.set_column_types([GObject.TYPE_STRING]);
	const [_ok, key, mods] =
		Gtk.accelerator_parse(
			settings.get_strv(settingsKeyName)[0]
		);
	model.set_value(model.append(), 0, Gtk.accelerator_get_label(key, mods));

	const tree = new Gtk.TreeView({ model: model, headers_visible: false });
	const column = new Gtk.TreeViewColumn();
	tree.append_column(column);

	const accel =
		new Gtk.CellRendererAccel({
			editable: true,
			accel_mode: Gtk.CellRendererAccelMode.GTK
		});
	accel.connect('accel-edited', (_accel, iter, key, mods) => {
		if (key === undefined || key === null) {
			return;
		}

		const name = Gtk.accelerator_name(key, mods);
		const [, iterator] = model.get_iter_from_string(iter);
		model.set(iterator, [0], [Gtk.accelerator_get_label(key, mods)]);
		settings.set_value(
			settingsKeyName,
			new GLib.Variant('as', [name])
		);
	});
	column.pack_start(accel, false);
	column.add_attribute(accel, 'text', 0);

	const row = new Adw.ActionRow({ title: settingsKey.get_summary() });
	row.add_suffix(tree);
	row.activatable_widget = tree;

	return row;
}

function keybindingBehaviorOutsideOfOverviewRow() {
	const settings = ExtensionUtils.getSettings();
	const settingsKeyName = 'keybinding-behavior-outside-of-overview';
	const settingsKey = settings.settings_schema.get_key(settingsKeyName);

	const comboBox = new Gtk.ComboBoxText();
	for (const id of settingsKey.get_range().deep_unpack()[1].get_strv()) {
		let text;
		switch (id) {
			case 'default':
				text = 'Default';
				break;
			case 'reorder':
				text = 'Reorder';
				break;
			case 'disabled':
				text = 'Disabled';
				break;
		}

		comboBox.append(id, text);
	}
	comboBox.set_active_id(settings.get_string(settingsKeyName));

	comboBox.connect('changed', () => {
		settings.set_string(settingsKeyName, comboBox.get_active_id());
	});

	const row = new Adw.ActionRow({
		title: settingsKey.get_summary(),
		subtitle: `
			<b>Default:</b> Keybindings will behave normally. <i>(May cause choppy animation when opening/closing overview.)</i>
			<b>Reorder:</b> Keybindings will reorder workspaces.
			<b>Disabled:</b> Keybindings will have no effect.
		`.trim().replace(/^[^\S\r\n]+/mg, '')
	});
	row.add_suffix(comboBox);
	row.activatable_widget = comboBox;

	return row;
}

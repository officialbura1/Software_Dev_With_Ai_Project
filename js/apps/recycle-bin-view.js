// js/apps/recycle-bin-view.js
// Recycle Bin route — show all soft-deleted items grouped by origin with
// restore and permanent delete.

import { el, $, $$, clear, fragment } from '../core/dom.js';
import { RecycleBin } from '../core/recycle-bin.js';
import { DateUtil } from '../core/date.js';
import { Icons } from '../core/icons.js';
import { Toast } from '../core/toast.js';
import { Modal } from '../core/modal.js';

function mountView(root) {
  const items = RecycleBin.list().sort((a, b) => (b.deletedAt || '').localeCompare(a.deletedAt || ''));
  clear(root);

  const headerActions = el('div', { class: 'view__actions' }, [
    el('button', {
      class: 'btn btn--ghost',
      onClick: async () => {
        if (!items.length) return;
        const ok = await Modal.confirm({
          title: 'Empty recycle bin?',
          message: 'This permanently deletes all ' + items.length + ' items in the bin.',
          confirmText: 'Empty',
          danger: true,
        });
        if (!ok) return;
        for (const it of items) RecycleBin.purge(it.id, it._origin);
        Toast.success('Recycle bin emptied');
        mountView(root);
      },
    }, [el('span', { class: 'icon', html: Icons.get('trash') }), 'Empty bin']),
  ]);

  root.appendChild(fragment([
    el('div', { class: 'view__header' }, [
      el('div', {}, [
        el('h1', { class: 'view__title', text: 'Recycle Bin' }),
        el('div', { class: 'view__subtitle', text: 'Deleted items are kept here for 30 days, then automatically removed.' }),
      ]),
      headerActions,
    ]),
    items.length
      ? el('div', { class: 'bin-list' },
          items.map(item => {
            const deletedAt = item.deletedAt ? new Date(item.deletedAt) : null;
            const daysLeft = deletedAt
              ? Math.max(0, 30 - Math.floor((Date.now() - deletedAt.getTime()) / 86400000))
              : 30;
            const isTodo = item._origin && item._origin.startsWith('todo');
            return el('div', { class: 'bin-row' }, [
              el('div', { class: 'bin-row__icon', html: Icons.get(isTodo ? 'check' : 'calendar') }),
              el('div', { class: 'bin-row__body' }, [
                el('div', { class: 'bin-row__title', text: item.title || '(untitled)' }),
                el('div', { class: 'bin-row__meta muted text-xs' }, [
                  item._origin || 'unknown',
                  deletedAt ? ` · deleted ${DateUtil.relative(deletedAt)}` : '',
                  ` · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`,
                ].join('')),
              ]),
              el('div', { class: 'bin-row__actions' }, [
                el('button', {
                  class: 'btn btn--ghost btn--sm',
                  onClick: () => {
                    RecycleBin.restore(item.id, item._origin);
                    Toast.success(`Restored "${item.title}"`);
                    document.dispatchEvent(new CustomEvent('data:changed', { detail: { origin: item._origin } }));
                    mountView(root);
                  },
                }, [el('span', { class: 'icon', html: Icons.get('restore') }), 'Restore']),
                el('button', {
                  class: 'btn btn--danger btn--sm',
                  onClick: async () => {
                    const ok = await Modal.confirm({
                      title: 'Delete permanently?',
                      message: `This will permanently delete "${item.title || 'this item'}".`,
                      confirmText: 'Delete',
                      danger: true,
                    });
                    if (!ok) return;
                    RecycleBin.purge(item.id, item._origin);
                    Toast.success('Deleted permanently');
                    mountView(root);
                  },
                }, [el('span', { class: 'icon', html: Icons.get('trash') }), 'Delete']),
              ]),
            ]);
          })
        )
      : el('div', { class: 'empty' }, [
          el('div', { class: 'empty__icon', html: Icons.get('bin') }),
          el('div', { class: 'empty__title', text: 'Recycle bin is empty' }),
          el('div', { class: 'empty__msg', text: 'Items deleted from the Calendar and To-Do appear here for 30 days.' }),
        ]),
  ]));
}

export const RecycleBinView = {
  mount: mountView,
};
import { useEffect, useState } from 'react'

const CONVERSATIONS_KEY = 'logicraft-conversations-v1'
const NOTIFICATIONS_KEY = 'logicraft-message-notifications-v1'

const sampleConversations = [
	{
		id: 'CONV-DRIVER-032', name: 'Christina Kamberina', role: 'Driver', initials: 'CK', presence: 'On trip', unread: 2,
		context: 'SHP-2026-08421', contextLabel: 'In transit · Newark to Chicago',
		latest: 'Traffic has slowed near Joliet. Still on track for the current ETA.', updated: '1:25 PM',
		messages: [
			{ id: 'MSG-001', from: 'me', text: 'Please send an update when you reach the I-80 checkpoint.', time: '1:08 PM' },
			{ id: 'MSG-002', from: 'contact', text: 'Just passed Gary, Indiana. Roads are clear so far.', time: '1:16 PM' },
			{ id: 'MSG-003', from: 'contact', text: 'Traffic has slowed near Joliet. Still on track for the current ETA.', time: '1:25 PM' },
		],
	},
	{
		id: 'CONV-CUSTOMER-10482', name: 'Northstar Retail', role: 'Customer', initials: 'NR', presence: 'Online', unread: 1,
		context: 'ORD-2026-10482', contextLabel: 'Order active · Delivery Oct 03',
		latest: 'Could you confirm the receiving dock for this delivery?', updated: '12:52 PM',
		messages: [
			{ id: 'MSG-004', from: 'me', text: 'Your order is in transit. Current predicted delivery is Oct 03 at 10:30 AM.', time: '12:43 PM' },
			{ id: 'MSG-005', from: 'contact', text: 'Could you confirm the receiving dock for this delivery?', time: '12:52 PM' },
		],
	},
	{
		id: 'CONV-WAREHOUSE-01', name: 'Newark Warehouse Team', role: 'Warehouse', initials: 'NW', presence: 'Team channel', unread: 0,
		context: 'SKU-EL-104', contextLabel: 'Inbound receipt · RCV-2026-0418',
		latest: 'Dock 02 is ready for the 9:30 AM electronics delivery.', updated: '11:42 AM',
		messages: [
			{ id: 'MSG-006', from: 'contact', text: 'Dock 02 is ready for the 9:30 AM electronics delivery.', time: '11:42 AM' },
			{ id: 'MSG-007', from: 'me', text: 'Thanks. Please check the carton count against PO-11842.', time: '11:47 AM' },
		],
	},
	{
		id: 'CONV-DISPATCH-01', name: 'Dispatch Desk', role: 'Team', initials: 'DD', presence: 'Team channel', unread: 0,
		context: 'SHP-2026-08396', contextLabel: 'Delivered · Seattle, WA',
		latest: 'Shipment SHP-2026-08396 was signed for at 9:42 AM.', updated: '9:44 AM',
		messages: [
			{ id: 'MSG-008', from: 'contact', text: 'Shipment SHP-2026-08396 was signed for at 9:42 AM.', time: '9:44 AM' },
			{ id: 'MSG-009', from: 'me', text: 'Received. I have updated the order record.', time: '9:49 AM' },
		],
	},
]

const sampleNotifications = [
	{ id: 'NOT-001', conversationId: 'CONV-DRIVER-032', title: 'Driver update', detail: 'Traffic slowdown reported near Joliet', time: '1:25 PM', type: 'driver', read: false },
	{ id: 'NOT-002', conversationId: 'CONV-CUSTOMER-10482', title: 'Customer question', detail: 'Receiving dock confirmation requested', time: '12:52 PM', type: 'customer', read: false },
	{ id: 'NOT-003', conversationId: 'CONV-WAREHOUSE-01', title: 'Pickup request', detail: 'Newark dock is ready for inbound goods', time: '11:42 AM', type: 'warehouse', read: true },
]

function readList(key, fallback) {
	try {
		const saved = JSON.parse(localStorage.getItem(key) ?? 'null')
		return Array.isArray(saved) ? saved : fallback
	} catch {
		return fallback
	}
}

function initials(name) {
	return name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('')
}

function clockTime() {
	return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function ConversationDialog({ onClose, onCreate }) {
	const [name, setName] = useState('')
	const [role, setRole] = useState('Driver')
	const [context, setContext] = useState('')

	return (
		<div className="messages-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
			<section className="messages-modal" role="dialog" aria-modal="true" aria-labelledby="new-conversation-title">
				<header className="messages-modal-heading"><div><span className="messages-kicker">TEAM INBOX / NEW THREAD</span><h2 id="new-conversation-title">Start a conversation</h2></div><button className="messages-icon-button" type="button" onClick={onClose} aria-label="Close new conversation">×</button></header>
				<form onSubmit={(event) => { event.preventDefault(); onCreate(name, role, context) }}>
					<label className="messages-field">Recipient<input autoFocus required value={name} onChange={(event) => setName(event.target.value)} placeholder="Name or team" /></label>
					<label className="messages-field">Team<select value={role} onChange={(event) => setRole(event.target.value)}><option>Driver</option><option>Customer</option><option>Warehouse</option><option>Team</option></select></label>
					<label className="messages-field">Related order, shipment, or topic<input value={context} onChange={(event) => setContext(event.target.value)} placeholder="Optional reference" /></label>
					<footer className="messages-form-actions"><button className="messages-secondary-button" type="button" onClick={onClose}>Cancel</button><button className="messages-primary-button" type="submit">Create conversation</button></footer>
				</form>
			</section>
		</div>
	)
}

export default function MessagesDashboard() {
	const [conversations, setConversations] = useState(() => readList(CONVERSATIONS_KEY, sampleConversations))
	const [notifications, setNotifications] = useState(() => readList(NOTIFICATIONS_KEY, sampleNotifications))
	const [selectedId, setSelectedId] = useState(() => readList(CONVERSATIONS_KEY, sampleConversations)[0]?.id ?? '')
	const [query, setQuery] = useState('')
	const [filter, setFilter] = useState('All')
	const [draft, setDraft] = useState('')
	const [notificationsOpen, setNotificationsOpen] = useState(false)
	const [newConversationOpen, setNewConversationOpen] = useState(false)

	useEffect(() => { try { localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations)) } catch {} }, [conversations])
	useEffect(() => { try { localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications)) } catch {} }, [notifications])

	const filtered = conversations.filter((conversation) => {
		const matchesQuery = `${conversation.name} ${conversation.role} ${conversation.latest} ${conversation.context}`.toLowerCase().includes(query.trim().toLowerCase())
		const matchesFilter = filter === 'All' || (filter === 'Unread' ? conversation.unread > 0 : conversation.role === filter)
		return matchesQuery && matchesFilter
	})
	const selected = conversations.find((conversation) => conversation.id === selectedId) ?? filtered[0]
	const unreadCount = conversations.reduce((sum, conversation) => sum + conversation.unread, 0)
	const unreadNotifications = notifications.filter((notification) => !notification.read).length

	const openConversation = (conversationId) => {
		setSelectedId(conversationId)
		setConversations((current) => current.map((conversation) => conversation.id === conversationId ? { ...conversation, unread: 0 } : conversation))
		setNotifications((current) => current.map((notification) => notification.conversationId === conversationId ? { ...notification, read: true } : notification))
		setNotificationsOpen(false)
	}

	const sendMessage = () => {
		const text = draft.trim()
		if (!text || !selected) return
		const time = clockTime()
		setConversations((current) => current.map((conversation) => conversation.id === selected.id ? {
			...conversation,
			unread: 0,
			latest: text,
			updated: time,
			messages: [...conversation.messages, { id: `MSG-${Date.now()}`, from: 'me', text, time }],
		} : conversation))
		setNotifications((current) => current.map((notification) => notification.conversationId === selected.id ? { ...notification, read: true } : notification))
		setDraft('')
	}

	const createConversation = (name, role, context) => {
		const conversation = {
			id: `CONV-${Date.now()}`, name: name.trim(), role, initials: initials(name.trim()), presence: role === 'Team' || role === 'Warehouse' ? 'Team channel' : 'New contact', unread: 0,
			context: context.trim(), contextLabel: context.trim() ? `Reference · ${context.trim()}` : 'No linked order or shipment',
			latest: 'Start a new conversation', updated: clockTime(), messages: [],
		}
		setConversations((current) => [conversation, ...current])
		setSelectedId(conversation.id)
		setFilter('All')
		setQuery('')
		setNewConversationOpen(false)
	}

	const markAllRead = () => {
		setConversations((current) => current.map((conversation) => ({ ...conversation, unread: 0 })))
		setNotifications((current) => current.map((notification) => ({ ...notification, read: true })))
	}

	return (
		<div className="messages-workspace">
			<header className="messages-page-heading"><div><span className="messages-kicker">OPERATIONS / TEAM COMMUNICATION</span><h1>Messages</h1><p>Keep every delivery conversation connected to its operation.</p></div><div className="messages-header-actions"><button className={`messages-notification-button${notificationsOpen ? ' is-open' : ''}`} type="button" onClick={() => setNotificationsOpen((current) => !current)} aria-expanded={notificationsOpen} aria-label={`Notifications${unreadNotifications ? `, ${unreadNotifications} unread` : ''}`}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>{unreadNotifications > 0 && <i>{unreadNotifications}</i>}</button><button className="messages-primary-button" type="button" onClick={() => setNewConversationOpen(true)}><span aria-hidden="true">＋</span> New message</button>
				{notificationsOpen && <section className="messages-notification-popover" aria-label="Notifications"><div className="messages-notification-heading"><div><strong>Notifications</strong><span>{unreadNotifications} unread</span></div><button type="button" onClick={markAllRead} disabled={!unreadNotifications}>Mark all read</button></div>{notifications.length ? notifications.map((notification) => { const related = conversations.find((conversation) => conversation.id === notification.conversationId); return <button className={`messages-notification-item${notification.read ? '' : ' is-unread'}`} type="button" key={notification.id} onClick={() => related && openConversation(related.id)}><span className={`messages-notification-mark notice-${notification.type}`} aria-hidden="true">{notification.type === 'driver' ? '↗' : notification.type === 'customer' ? '◇' : '↓'}</span><span><strong>{notification.title}</strong><small>{notification.detail}</small><time>{notification.time}</time></span>{!notification.read && <i />}</button> }) : <p className="messages-empty-notifications">You’re all caught up.</p>}</section>}
				</div></header>

			<div className="messages-inbox-layout">
				<aside className="messages-glass-card messages-conversation-panel" aria-label="Conversations">
					<div className="messages-inbox-heading"><div><h2>Inbox</h2><span>{unreadCount} unread</span></div><button type="button" onClick={() => setNewConversationOpen(true)} aria-label="Start a new conversation" title="New conversation">＋</button></div>
					<label className="messages-search"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search conversations" aria-label="Search conversations" /></label>
					<div className="messages-filter-tabs" role="group" aria-label="Filter conversations">{['All', 'Unread', 'Driver', 'Customer', 'Warehouse', 'Team'].map((item) => <button type="button" key={item} className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div>
					<div className="messages-conversation-list">{filtered.map((conversation) => <button className={`messages-conversation-item${selected?.id === conversation.id ? ' is-selected' : ''}`} type="button" key={conversation.id} onClick={() => openConversation(conversation.id)}><span className={`messages-contact-avatar role-${conversation.role.toLowerCase()}`}>{conversation.initials}</span><span className="messages-conversation-copy"><span className="messages-contact-line"><strong>{conversation.name}</strong><time>{conversation.updated}</time></span><span className="messages-role-line">{conversation.role}<i />{conversation.presence}</span><span className="messages-preview-line">{conversation.latest}</span></span>{conversation.unread > 0 && <span className="messages-unread-count">{conversation.unread}</span>}</button>)}
						{filtered.length === 0 && <p className="messages-empty-list">No conversations match this view.</p>}</div>
				</aside>

				{selected ? <section className="messages-glass-card messages-thread-panel" aria-label={`Conversation with ${selected.name}`}>
					<header className="messages-thread-heading"><span className={`messages-contact-avatar role-${selected.role.toLowerCase()}`}>{selected.initials}</span><div><h2>{selected.name}</h2><p><span className={`messages-presence-dot${selected.presence === 'On trip' ? ' is-traveling' : ''}`} />{selected.role} · {selected.presence}</p></div><span className="messages-thread-context">{selected.contextLabel}</span></header>
					{selected.context && <div className="messages-context-strip"><span>RELATED OPERATION</span><strong>{selected.context}</strong><small>{selected.contextLabel}</small></div>}
					<div className="messages-thread-body" aria-live="polite">{selected.messages.length ? selected.messages.map((message, index) => <article className={`messages-bubble-row${message.from === 'me' ? ' from-me' : ''}`} key={message.id}><span className={`messages-bubble-avatar${message.from === 'me' ? ' avatar-me' : ''}`}>{message.from === 'me' ? 'LC' : selected.initials}</span><div className="messages-bubble-stack">{message.from !== 'me' && index === 0 && <strong className="messages-sender-name">{selected.name}</strong>}<p className="messages-bubble">{message.text}</p><time>{message.time}</time></div></article>) : <div className="messages-thread-empty"><span className="messages-empty-icon">✉</span><strong>Start the conversation</strong><span>Send a message to {selected.name}.</span></div>}</div>
					<form className="messages-composer" onSubmit={(event) => { event.preventDefault(); sendMessage() }}><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage() } }} rows="2" placeholder={`Message ${selected.name}...`} aria-label={`Message ${selected.name}`} /><div className="messages-composer-footer"><span>Enter to send · Shift + Enter for a new line</span><button className="messages-send-button" type="submit" disabled={!draft.trim()} aria-label="Send message"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 12 16-8-5 16-3-7-8-1Zm8 1 4-5" /></svg>Send</button></div></form>
				</section> : <section className="messages-glass-card messages-thread-empty"><span className="messages-empty-icon">✉</span><h2>Select a conversation</h2><p>Choose a thread or start a new message.</p><button className="messages-primary-button" type="button" onClick={() => setNewConversationOpen(true)}>New message</button></section>}
			</div>
			{newConversationOpen && <ConversationDialog onClose={() => setNewConversationOpen(false)} onCreate={createConversation} />}
		</div>
	)
}

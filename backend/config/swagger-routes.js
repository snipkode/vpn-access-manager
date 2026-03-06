/**
 * @swagger
 * components:
 *   schemas:
 *     AdminBillingStats:
 *       type: object
 *       properties:
 *         total_payments: { type: integer }
 *         pending: { type: integer }
 *         approved: { type: integer }
 *         rejected: { type: integer }
 *         total_revenue: { type: integer }
 *         this_month_revenue: { type: integer }
 *
 *     CreditStats:
 *       type: object
 *       properties:
 *         total_users_with_credit: { type: integer }
 *         total_credit_in_circulation: { type: integer }
 *         today_volume: { type: integer }
 *         today_transactions: { type: integer }
 *         pending_reviews: { type: integer }
 *         blocked_transactions: { type: integer }
 *
 *     FraudAlert:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         user_id: { type: string }
 *         transaction_id: { type: string }
 *         risk_level: { type: string, enum: [low, medium, high, critical] }
 *         flags: { type: array, items: { type: string } }
 *         status: { type: string, enum: [pending, approved, rejected] }
 *         reviewed: { type: boolean }
 *         created_at: { type: string, format: date-time }
 *
 *     Backup:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         filename: { type: string }
 *         size: { type: integer }
 *         type: { type: string, enum: [full, users, payments, transactions] }
 *         status: { type: string, enum: [completed, failed, in_progress] }
 *         created_at: { type: string, format: date-time }
 *
 *     Settings:
 *       type: object
 *       properties:
 *         whatsapp:
 *           type: object
 *           properties:
 *             enabled: { type: boolean }
 *             api_url: { type: string }
 *             session_id: { type: string }
 *         email:
 *           type: object
 *           properties:
 *             enabled: { type: boolean }
 *             smtp_host: { type: string }
 *             smtp_port: { type: integer }
 *         billing:
 *           type: object
 *           properties:
 *             billing_enabled: { type: boolean }
 *             currency: { type: string }
 *             min_topup: { type: integer }
 *             max_topup: { type: integer }
 *
 * /api/admin/users/{id}:
 *   get:
 *     summary: Get user by ID (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *
 *   patch:
 *     summary: Update user VPN access (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vpn_enabled
 *             properties:
 *               vpn_enabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User VPN access updated
 *       400:
 *         description: Invalid vpn_enabled value
 *       404:
 *         description: User not found
 *
 * /api/admin/devices:
 *   get:
 *     summary: Get all devices (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all devices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 devices:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Device'
 *
 * /api/admin/device/{id}:
 *   delete:
 *     summary: Revoke any device (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Device revoked successfully
 *       404:
 *         description: Device not found
 *
 * /api/admin/stats:
 *   get:
 *     summary: Get VPN statistics (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: VPN statistics retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_users: { type: integer }
 *                 vpn_enabled_users: { type: integer }
 *                 vpn_disabled_users: { type: integer }
 *                 active_devices: { type: integer }
 *
 * /api/admin/billing/payments:
 *   get:
 *     summary: Get all payments with filters (Admin only)
 *     tags: [Admin Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Payments retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 payments:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/Payment'
 *                       - type: object
 *                         properties:
 *                           user_email: { type: string }
 *
 * /api/admin/billing/payments/{id}:
 *   get:
 *     summary: Get payment details (Admin only)
 *     tags: [Admin Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment details retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 payment:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Payment'
 *                     - type: object
 *                       properties:
 *                         user_email: { type: string }
 *
 * /api/admin/billing/payments/{id}/approve:
 *   post:
 *     summary: Approve payment (Admin only)
 *     tags: [Admin Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               admin_note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment approved successfully
 *       404:
 *         description: Payment not found
 *       400:
 *         description: Payment already processed
 *
 * /api/admin/billing/payments/{id}/reject:
 *   post:
 *     summary: Reject payment (Admin only)
 *     tags: [Admin Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               admin_note:
 *                 type: string
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment rejected
 *       404:
 *         description: Payment not found
 *
 * /api/admin/billing/billing/stats:
 *   get:
 *     summary: Get billing statistics (Admin only)
 *     tags: [Admin Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Billing statistics retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminBillingStats'
 *
 * /api/admin/credit/transactions:
 *   get:
 *     summary: Get all credit transactions (Admin only)
 *     tags: [Admin Credit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [transfer, topup, refund, deduction]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, blocked, cancelled]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Transactions retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transactions:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/CreditTransaction'
 *                       - type: object
 *                         properties:
 *                           from_email: { type: string }
 *                           to_email: { type: string }
 *
 * /api/admin/credit/fraud-alerts:
 *   get:
 *     summary: Get fraud alerts (Admin only)
 *     tags: [Admin Credit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Fraud alerts retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 alerts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FraudAlert'
 *
 * /api/admin/credit/fraud-alerts/{id}/review:
 *   patch:
 *     summary: Review fraud alert (Admin only)
 *     tags: [Admin Credit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [approve, reject]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Alert reviewed successfully
 *       404:
 *         description: Alert not found
 *
 * /api/admin/credit/stats:
 *   get:
 *     summary: Get credit statistics (Admin only)
 *     tags: [Admin Credit]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Credit statistics retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreditStats'
 *
 * /api/admin/credit/users/{id}/add:
 *   post:
 *     summary: Add credit to user (Admin only)
 *     tags: [Admin Credit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: integer
 *                 example: 10000
 *               description:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Credit added successfully
 *       404:
 *         description: User not found
 *
 * /api/admin/credit/users/{id}/deduct:
 *   post:
 *     summary: Deduct credit from user (Admin only)
 *     tags: [Admin Credit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: integer
 *               description:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Credit deducted successfully
 *       400:
 *         description: Insufficient balance
 *
 * /api/admin/settings:
 *   get:
 *     summary: Get all system settings (Admin only)
 *     tags: [Admin Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Settings retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 settings:
 *                   $ref: '#/components/schemas/Settings'
 *
 *   patch:
 *     summary: Update system settings (Admin only)
 *     tags: [Admin Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *           enum: [whatsapp, email, billing, general, notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: Settings updated
 *
 * /api/admin/settings/whatsapp/test:
 *   post:
 *     summary: Test WhatsApp connection (Admin only)
 *     tags: [Admin Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *               test_phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Test message sent
 *       400:
 *         description: WhatsApp not configured
 *
 * /api/admin/settings/email/test:
 *   post:
 *     summary: Test email connection (Admin only)
 *     tags: [Admin Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               to:
 *                 type: string
 *               subject:
 *                 type: string
 *               body:
 *                 type: string
 *     responses:
 *       200:
 *         description: Test email sent
 *       400:
 *         description: Email not configured
 *
 * /api/admin/backup:
 *   get:
 *     summary: List all backups (Admin only)
 *     tags: [Admin Backup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backups retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 backups:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Backup'
 *
 *   post:
 *     summary: Create new backup (Admin only)
 *     tags: [Admin Backup]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [full, users, payments, transactions]
 *     responses:
 *       202:
 *         description: Backup initiated
 *
 * /api/admin/backup/{id}/restore:
 *   post:
 *     summary: Restore from backup (Admin only)
 *     tags: [Admin Backup]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       202:
 *         description: Restore initiated
 *       404:
 *         description: Backup not found
 *
 * /api/user/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 profile:
 *                   $ref: '#/components/schemas/User'
 *
 *   patch:
 *     summary: Update user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               display_name:
 *                 type: string
 *               phone:
 *                 type: string
 *               whatsapp:
 *                 type: string
 *               avatar_url:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 *       400:
 *         description: Invalid input
 *
 * /api/credit/balance:
 *   get:
 *     summary: Get user's credit balance
 *     tags: [Credit]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Balance retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 balance: { type: integer }
 *                 total_earned: { type: integer }
 *                 total_spent: { type: integer }
 *                 formatted_balance: { type: string }
 *
 * /api/credit/transfer:
 *   post:
 *     summary: Transfer credit to another user
 *     tags: [Credit]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               to_user_email:
 *                 type: string
 *               to_user_id:
 *                 type: string
 *               amount:
 *                 type: integer
 *               description:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Transfer successful
 *       400:
 *         description: Invalid amount or insufficient balance
 *       403:
 *         description: Transfer blocked (fraud detected)
 *       404:
 *         description: Recipient not found
 *
 * /api/referral/code:
 *   get:
 *     summary: Get or create referral code
 *     tags: [Referral]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Referral code retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 referral_code: { type: string }
 *                 referral_link: { type: string }
 *                 tier: { type: string }
 *                 stats:
 *                   type: object
 *
 * /api/referral/stats:
 *   get:
 *     summary: Get referral statistics
 *     tags: [Referral]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved
 */

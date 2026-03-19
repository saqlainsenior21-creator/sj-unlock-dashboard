  return (
    <div className="container">
      <header>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="intelligence-badge">SECURE INTEL MODE</div>
            <h1>IMEI INTELLIGENCE DASHBOARD</h1>
            <p>Real-time Global Brand Policy & Unlock Eligibility Engine</p>
          </div>
          {adminMode && (
            <div className="wallet-card slide-up">
              <div className="analytics-label"><Wallet size={12} /> Credit Balance</div>
              <div className="analytics-value" style={{ color: 'var(--success)', fontSize: '1.2rem' }}>${walletBalance.toFixed(2)}</div>
              <button className="tool-btn accent" style={{ padding: '0.2rem 0.5rem', marginTop: '0.5rem', fontSize: '0.6rem' }} onClick={() => setWalletBalance(b => b + 100)}><Plus size={10} /> RECHARGE</button>
            </div>
          )}
        </div>
      </header>

      {adminMode && (
        <div className="admin-analytics slide-up">
          <div className="analytics-card">
            <div className="analytics-label">Total Revenue</div>
            <div className="analytics-value text-success">${orders.reduce((sum, o) => sum + (Number(o.price) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="analytics-card">
            <div className="analytics-label">Total Orders</div>
            <div className="analytics-value">{orders.length}</div>
          </div>
          <div className="analytics-card">
            <div className="analytics-label">Success Rate</div>
            <div className="analytics-value">{((orders.filter(o => o.status === 'success').length / (orders.length || 1)) * 100).toFixed(1)}%</div>
          </div>
          <div className="analytics-card" style={{ cursor: 'pointer' }} onClick={downloadCSV}>
            <div className="analytics-label">Export Data</div>
            <div className="analytics-value" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--accent-blue)' }}><Download size={20} /> CSV</div>
          </div>
        </div>
      )}

      <div className="brand-tabs slide-up">
        <button className={`tab-btn ${activeBrand === 'apple' ? 'active' : ''}`} onClick={() => setActiveBrand('apple')}>IPHONE INTEL</button>
        <button className={`tab-btn ${activeBrand === 'samsung' ? 'active' : ''}`} onClick={() => setActiveBrand('samsung')}>SAMSUNG INTEL</button>
      </div>

      <div className="search-section">
        <form onSubmit={checkIMEI}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <select value={service} onChange={(e) => setService(e.target.value)} className="service-select">
              <option value="1">Carrier Policy / Next Tether</option>
              <option value="2">GSMA Blacklist Premium</option>
              <option value="3">iCloud & Knox Security</option>
              <option value="4">Network Management / MDM</option>
            </select>
            <div className="input-group" style={{ flexGrow: 1, marginBottom: 0 }}>
              <Database className="input-icon" size={20} />
              <input type="text" placeholder={`ENTER 15-DIGIT ${activeBrand.toUpperCase()} IMEI`} maxLength={15} value={imei} onChange={(e) => setImei(e.target.value.replace(/\D/g, ''))} />
            </div>
          </div>
          <button type="submit" disabled={loading || imei.length !== 15}>{loading ? 'EXTRACTING DEEP INTEL...' : `START ${activeBrand.toUpperCase()} ADVANCED CHECK`}</button>
        </form>
        {error && <div className="error-msg">{error}</div>}
      </div>

      {loading && <div className="loading-state"><Activity className="spin" size={32} /><p>Querying {activeBrand === 'apple' ? 'GSMA & Apple' : 'Samsung & Knox'} Servers...</p></div>}

      {report && (
        <div className="report-grid slide-up">
          <div className="report-main">
            <div className="report-actions">
              <button className="tool-btn">Scan IMEI</button>
              <button className="tool-btn" onClick={() => navigator.clipboard.writeText(JSON.stringify(report, null, 2))}>Clipboard</button>
              <button className="tool-btn" onClick={() => addToCart(report.imei, report.modelDescription)}>Add To Cart</button>
            </div>
            <div className="intel-report-details">
              <div className="detail-row"><span className="detail-label">Model Description:</span> <span className="detail-value">{report.modelDescription}</span></div>
              <div className="detail-row"><span className="detail-label">IMEI:</span> <span className="detail-value">{report.imei}</span></div>
              <div className="detail-row"><span className="detail-label">Serial Number:</span> <span className="detail-value">{report.serialNumber}</span></div>
              <div className="detail-row divider"></div>
              {activeBrand === 'apple' ? (
                <>
                  <div className="detail-row"><span className="detail-label">FMI Status:</span> <span className={`detail-value ${report.fmiStatus === 'OFF' ? 'text-success' : 'text-danger'}`}>{report.fmiStatus}</span></div>
                  <div className="detail-row"><span className="detail-label">Activation:</span> <span className="detail-value">{report.activationStatus}</span></div>
                  <div className="detail-row"><span className="detail-label">Tether Policy:</span> <span className="detail-value highlight-carrier">{report.nextTetherPolicy}</span></div>
                </>
              ) : (
                <>
                  <div className="detail-row"><span className="detail-label">Knox Status:</span> <span className="detail-value text-success">{report.knoxStatus}</span></div>
                  <div className="detail-row"><span className="detail-label">Model Code:</span> <span className="detail-value">{report.modelCode}</span></div>
                  <div className="detail-row"><span className="detail-label">Carrier Info:</span> <span className="detail-value highlight-carrier">{report.carrier}</span></div>
                </>
              )}
              <div className="detail-row"><span className="detail-label">Blacklist Status:</span> <span className={`detail-value ${report.blacklistStatus === 'CLEAN' ? 'text-success' : 'text-danger'}`}>{report.blacklistStatus}</span></div>
              <div className="detail-row"><span className="detail-label">Sim-Lock Status:</span> <span className="detail-value highlight-status">{report.simLockStatus}</span></div>
            </div>
          </div>
        </div>
      )}

      <section className="orders-section slide-up">
        <div className="orders-header">
          <h2>Order Sequence Tracking</h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button onClick={() => setShowSingleModal(true)} className="tool-btn" style={{ background: 'var(--accent-blue)', color: 'white' }}>SINGLE ORDER</button>
            <button onClick={() => setShowBulkModal(true)} className="tool-btn" style={{ background: 'var(--success)', color: 'white' }}>BULK ORDER</button>
            {adminMode ? <button onClick={() => setAdminMode(false)} className="tool-btn" style={{ background: 'var(--danger)', color: 'white' }}>EXIT ADMIN</button> : <button onClick={() => setShowAdminLogin(true)} className="tool-btn">ADMIN ACCESS</button>}
            <input type="text" placeholder="Filter..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input-small" />
          </div>
        </div>
        <div className="orders-table-container">
          <table className="orders-table">
            <thead><tr><th>Order ID</th><th>Model</th><th>Price</th><th>Fulfillment</th><th>IMEI</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order.id}>
                  <td>{order.id}</td><td>{order.model}</td>
                  <td>{adminMode ? <input type="number" defaultValue={order.price} onBlur={(e) => updatePrice(order.id, e.target.value)} className="price-input" /> : `$${Number(order.price).toFixed(2)}`}</td>
                  <td style={{ fontSize: '0.75rem' }}>{order.processingTime}</td><td>{order.imei}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <span className={`status-pill ${order.status.replace(/\s+/g, '-')}`}>{order.status}</span>
                      {adminMode && (
                        <div style={{ display: 'flex', gap: '0.2rem' }}>
                          <button onClick={() => updateStatus(order.id, 'success')} className="status-btn-small success">✓</button>
                          <button onClick={() => updateStatus(order.id, 'denied')} className="status-btn-small denied">✕</button>
                          <button onClick={() => updateStatus(order.id, 'in process')} className="status-btn-small process">⋯</button>
                          {order.status === 'denied' && <button onClick={() => handleRefund(order.id)} className="status-btn-small refund">R</button>}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>{order.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showAdminLogin && (
        <div className="modal-overlay">
          <div className="report-main" style={{ width: '350px', position: 'relative' }}>
            <button onClick={() => setShowAdminLogin(false)} className="close-modal">✕</button>
            <h3 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>ADMIN VERIFICATION</h3>
            <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input type="password" placeholder="ACCESS KEY" required value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="admin-pw-input" />
              <button type="submit" className="tool-btn accent">VERIFY INTEL KEY</button>
            </form>
          </div>
        </div>
      )}

      {showBulkModal && (
        <div className="modal-overlay">
          <div className="report-main" style={{ width: '450px', position: 'relative' }}>
            <button onClick={() => setShowBulkModal(false)} className="close-modal">✕</button>
            <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>BULK IMEI PROCESSING</h3>
            <form onSubmit={handleBulkSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <textarea placeholder="IMEIs..." required value={bulkText} onChange={e => setBulkText(e.target.value)} style={{ height: '200px', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--border)', padding: '1rem' }} />
              <button type="submit" className="tool-btn accent">SUBMIT BATCH</button>
            </form>
          </div>
        </div>
      )}

      {showSingleModal && (
        <div className="modal-overlay">
          <div className="report-main" style={{ width: '400px', position: 'relative' }}>
            <button onClick={() => setShowSingleModal(false)} className="close-modal">✕</button>
            <h3 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>QUICK SINGLE ORDER</h3>
            <form onSubmit={handleSingleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input type="text" placeholder="IMEI (15 Digits)" maxLength={15} required value={singleOrder.imei} onChange={e => setSingleOrder({...singleOrder, imei: e.target.value.replace(/\D/g, '')})} />
              <input type="text" placeholder="Model (e.g. Galaxy S24)" required value={singleOrder.model} onChange={e => setSingleOrder({...singleOrder, model: e.target.value})} />
              <button type="submit" className="tool-btn accent">CREATE MANUAL ORDER</button>
            </form>
          </div>
        </div>
      )}

      <footer><p>© 2026 iUnlock Intel - GSMA Registered Dashboard</p></footer>
    </div>
  );

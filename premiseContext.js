/**
 * premiseContext.js
 * 
 * Reusable utility for loading and displaying premise context
 * across all premises-related forms
 */

/**
 * Loads premise data and displays it in a context header
 * @param {SupabaseClient} supabase - The supabase client instance
 * @param {string} premiseId - The premise ID from URL params
 * @param {string} containerId - The ID of the container element to render into
 * @returns {Promise<Object>} The premise data object
 */
export async function loadPremiseContext(supabase, premiseId, containerId = 'premiseContext') {
    const container = document.getElementById(containerId);

    if (!premiseId) {
        if (container) {
            container.innerHTML = `
                <div style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); 
                            padding: 1rem; border-radius: 12px; margin-bottom: 2rem; 
                            border: 1px solid #fca5a5; color: #991b1b;">
                    <strong>⚠️ Error:</strong> No premise ID provided. Please return to premises management.
                </div>
            `;
        }
        throw new Error('No premise ID provided');
    }

    try {
        const { data: premise, error } = await supabase
            .from('premises')
            .select('*')
            .eq('id', premiseId)
            .single();

        if (error) throw error;

        if (!premise) {
            if (container) {
                container.innerHTML = `
                    <div style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); 
                                padding: 1rem; border-radius: 12px; margin-bottom: 2rem; 
                                border: 1px solid #fca5a5; color: #991b1b;">
                        <strong>⚠️ Error:</strong> Premise not found.
                    </div>
                `;
            }
            throw new Error('Premise not found');
        }

        if (container) {
            renderPremiseContext(premise, container);
        }

        return premise;
    } catch (error) {
        console.error('Error loading premise context:', error);
        if (container) {
            container.innerHTML = `
                <div style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); 
                            padding: 1rem; border-radius: 12px; margin-bottom: 2rem; 
                            border: 1px solid #fca5a5; color: #991b1b;">
                    <strong>⚠️ Error:</strong> ${error.message}
                </div>
            `;
        }
        throw error;
    }
}

/**
 * Renders the premise context header
 * @param {Object} premise - The premise data object
 * @param {HTMLElement} container - The container element
 */
function renderPremiseContext(premise, container) {
    const regStatus = premise.registration_status || 'Unknown';
    let statusClass = 'Pending';
    if (regStatus === 'Registered') statusClass = 'Compliant';
    else if (regStatus === 'Suspended' || regStatus === 'Closed') statusClass = 'NonCompliant';

    const locationParts = [premise.ward, premise.sub_county, premise.county].filter(Boolean);
    const location = locationParts.join(', ') || '—';

    container.innerHTML = `
        <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); 
                    padding: 1.5rem; border-radius: 16px; margin-bottom: 2rem; 
                    border: 1px solid #bfdbfe; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
            <div style="display: flex; justify-content: space-between; align-items: start; gap: 1rem; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 250px;">
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;">
                        <span style="font-size: 1.5rem;">🏭</span>
                        <h2 style="font-size: 1.5rem; font-weight: 700; color: #1e40af; margin: 0;">
                            ${premise.name}
                        </h2>
                    </div>
                    <div style="display: grid; gap: 0.5rem; font-size: 0.95rem; color: #475569;">
                        <div><strong style="color: #1e40af;">Type:</strong> ${premise.type || '—'} ${premise.category ? `| ${premise.category}` : ''}</div>
                        <div><strong style="color: #1e40af;">Location:</strong> ${location}</div>
                        ${premise.address ? `<div><strong style="color: #1e40af;">Address:</strong> ${premise.address}</div>` : ''}
                        <div><strong style="color: #1e40af;">Ownership:</strong> ${premise.ownership || '—'}</div>
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.75rem; align-items: flex-end;">
                    <span class="badge ${statusClass}" style="padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.875rem; font-weight: 600;">
                        ${regStatus}
                    </span>
                    <a href="premises_management.html" 
                       style="color: #2563eb; text-decoration: none; font-weight: 600; font-size: 0.9rem; 
                              display: inline-flex; align-items: center; gap: 0.5rem; 
                              padding: 0.5rem 1rem; background: white; border-radius: 8px; 
                              border: 1px solid #bfdbfe; transition: all 0.3s ease;">
                        ← Back to Premises
                    </a>
                </div>
            </div>
        </div>
    `;
}

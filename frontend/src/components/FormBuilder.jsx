import React, { useState } from 'react';

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'file', label: 'File Upload' },
];

const FormBuilder = ({ fields = [], onChange, readOnly = false }) => {
  const [editingIndex, setEditingIndex] = useState(null);

  const addField = () => {
    onChange([...fields, { label: '', fieldType: 'text', required: false, options: [] }]);
    setEditingIndex(fields.length);
  };

  const updateField = (index, key, value) => {
    const updated = fields.map((f, i) => (i === index ? { ...f, [key]: value } : f));
    onChange(updated);
  };

  const removeField = (index) => {
    onChange(fields.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  };

  const moveField = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= fields.length) return;
    const updated = [...fields];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    onChange(updated);
    setEditingIndex(newIndex);
  };

  const addOption = (index) => {
    const updated = fields.map((f, i) =>
      i === index ? { ...f, options: [...(f.options || []), ''] } : f
    );
    onChange(updated);
  };

  const updateOption = (fieldIndex, optIndex, value) => {
    const updated = fields.map((f, i) => {
      if (i !== fieldIndex) return f;
      const newOptions = f.options.map((o, j) => (j === optIndex ? value : o));
      return { ...f, options: newOptions };
    });
    onChange(updated);
  };

  const removeOption = (fieldIndex, optIndex) => {
    const updated = fields.map((f, i) => {
      if (i !== fieldIndex) return f;
      return { ...f, options: f.options.filter((_, j) => j !== optIndex) };
    });
    onChange(updated);
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
    color: '#fff', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none',
  };

  const needsOptions = (type) => type === 'dropdown' || type === 'checkbox';

  return (
    <div>
      {/* Field list */}
      {fields.length === 0 && !readOnly && (
        <div style={{
          textAlign: 'center', padding: '2rem', color: '#555',
          border: '2px dashed rgba(255,255,255,0.08)', borderRadius: '14px', marginBottom: '16px',
        }}>
          <p style={{ fontSize: '0.95rem', marginBottom: '4px' }}>No form fields yet</p>
          <p style={{ fontSize: '0.8rem', color: '#444' }}>Add fields that participants must fill during registration</p>
        </div>
      )}

      {fields.map((field, index) => (
        <div key={index} style={{
          background: editingIndex === index ? 'rgba(59,130,246,0.05)' : 'rgba(255,255,255,0.02)',
          border: `1px solid ${editingIndex === index ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.06)'}`,
          borderRadius: '12px', padding: '16px', marginBottom: '10px',
          transition: 'all 0.2s',
        }}>
          {/* Field header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: editingIndex === index ? '14px' : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
              <span style={{ color: '#555', fontSize: '0.8rem', fontWeight: 600, minWidth: '24px' }}>#{index + 1}</span>
              {editingIndex === index ? (
                <input
                  value={field.label}
                  onChange={(e) => updateField(index, 'label', e.target.value)}
                  placeholder="Field label (e.g. T-shirt size)"
                  style={{ ...inputStyle, flex: 1 }}
                  autoFocus
                />
              ) : (
                <span
                  onClick={() => !readOnly && setEditingIndex(index)}
                  style={{ fontWeight: 600, cursor: readOnly ? 'default' : 'pointer', fontSize: '0.95rem' }}
                >
                  {field.label || <span style={{ color: '#555', fontStyle: 'italic' }}>Untitled field</span>}
                  {field.required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
                </span>
              )}
            </div>

            {!readOnly && (
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button onClick={() => moveField(index, -1)} disabled={index === 0}
                  style={{ background: 'none', border: 'none', color: index === 0 ? '#333' : '#888', cursor: index === 0 ? 'default' : 'pointer', fontSize: '1rem', padding: '4px' }}>↑</button>
                <button onClick={() => moveField(index, 1)} disabled={index === fields.length - 1}
                  style={{ background: 'none', border: 'none', color: index === fields.length - 1 ? '#333' : '#888', cursor: index === fields.length - 1 ? 'default' : 'pointer', fontSize: '1rem', padding: '4px' }}>↓</button>
                <button onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                  style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.85rem', padding: '4px 8px' }}>
                  {editingIndex === index ? 'Done' : 'Edit'}
                </button>
                <button onClick={() => removeField(index)}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', padding: '4px 8px' }}>✕</button>
              </div>
            )}
          </div>

          {/* Expanded editing */}
          {editingIndex === index && !readOnly && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center' }}>
                <div>
                  <label style={{ color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', display: 'block' }}>Field Type</label>
                  <select
                    value={field.fieldType}
                    onChange={(e) => updateField(index, 'fieldType', e.target.value)}
                    style={inputStyle}
                  >
                    {FIELD_TYPES.map(ft => (
                      <option key={ft.value} value={ft.value}>{ft.label}</option>
                    ))}
                  </select>
                </div>
                <div style={{ paddingTop: '18px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#ccc', fontSize: '0.85rem' }}>
                    <button
                      type="button"
                      onClick={() => updateField(index, 'required', !field.required)}
                      style={{
                        width: '40px', height: '22px', borderRadius: '11px', border: 'none',
                        background: field.required ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                        cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                      }}
                    >
                      <div style={{
                        width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
                        position: 'absolute', top: '3px',
                        left: field.required ? '21px' : '3px', transition: 'left 0.2s',
                      }} />
                    </button>
                    Required
                  </label>
                </div>
              </div>

              {/* Options for dropdown / checkbox */}
              {needsOptions(field.fieldType) && (
                <div>
                  <label style={{ color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' }}>
                    Options
                  </label>
                  {(field.options || []).map((opt, optIdx) => (
                    <div key={optIdx} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                      <span style={{ color: '#555', fontSize: '0.8rem', minWidth: '20px' }}>{optIdx + 1}.</span>
                      <input
                        value={opt}
                        onChange={(e) => updateOption(index, optIdx, e.target.value)}
                        placeholder={`Option ${optIdx + 1}`}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <button onClick={() => removeOption(index, optIdx)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem', padding: '4px' }}>✕</button>
                    </div>
                  ))}
                  <button onClick={() => addOption(index)} style={{
                    background: 'none', border: '1px dashed rgba(255,255,255,0.15)',
                    borderRadius: '8px', color: '#888', cursor: 'pointer', fontSize: '0.8rem',
                    padding: '8px 16px', width: '100%', marginTop: '4px',
                  }}>+ Add Option</button>
                </div>
              )}
            </div>
          )}

          {/* Read-only details */}
          {readOnly && (
            <div style={{ display: 'flex', gap: '12px', marginTop: '6px', flexWrap: 'wrap' }}>
              <span style={{ padding: '2px 10px', borderRadius: '8px', fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', color: '#888' }}>
                {FIELD_TYPES.find(ft => ft.value === field.fieldType)?.label || field.fieldType}
              </span>
              {field.required && (
                <span style={{ padding: '2px 10px', borderRadius: '8px', fontSize: '0.75rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>Required</span>
              )}
              {needsOptions(field.fieldType) && field.options?.length > 0 && (
                <span style={{ padding: '2px 10px', borderRadius: '8px', fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', color: '#666' }}>
                  {field.options.length} option{field.options.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Add field button */}
      {!readOnly && (
        <button onClick={addField} style={{
          width: '100%', padding: '14px', background: 'rgba(59,130,246,0.1)',
          border: '1px dashed rgba(59,130,246,0.3)', borderRadius: '12px',
          color: '#3b82f6', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
          transition: 'background 0.2s',
        }}>
          + Add Form Field
        </button>
      )}

      {/* Live Preview */}
      {!readOnly && fields.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <h4 style={{ fontSize: '0.85rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
            📋 Preview
          </h4>
          <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '14px', padding: '20px',
          }}>
            {fields.map((field, i) => (
              <div key={i} style={{ marginBottom: i < fields.length - 1 ? '16px' : 0 }}>
                <label style={{ display: 'block', marginBottom: '6px', color: '#ccc', fontSize: '0.9rem' }}>
                  {field.label || 'Untitled'} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                </label>
                {field.fieldType === 'dropdown' ? (
                  <select disabled style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }}>
                    <option>Select...</option>
                    {(field.options || []).filter(Boolean).map((opt, j) => <option key={j}>{opt}</option>)}
                  </select>
                ) : field.fieldType === 'checkbox' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {(field.options || []).filter(Boolean).map((opt, j) => (
                      <label key={j} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#aaa', fontSize: '0.85rem' }}>
                        <input type="checkbox" disabled /> {opt}
                      </label>
                    ))}
                    {(!field.options || field.options.filter(Boolean).length === 0) && (
                      <span style={{ color: '#555', fontSize: '0.8rem', fontStyle: 'italic' }}>Add options above</span>
                    )}
                  </div>
                ) : field.fieldType === 'file' ? (
                  <div style={{
                    padding: '20px', border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '10px',
                    textAlign: 'center', color: '#555', fontSize: '0.85rem',
                  }}>
                    📎 File upload
                  </div>
                ) : (
                  <input
                    type={field.fieldType === 'number' ? 'number' : 'text'}
                    disabled
                    placeholder={`Enter ${field.label || '...'}`}
                    style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FormBuilder;

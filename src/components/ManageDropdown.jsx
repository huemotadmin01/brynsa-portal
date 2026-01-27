import { useState, useRef, useEffect } from 'react';
import {
  ChevronDown, Upload, ListPlus, Pencil, Tag, Trash2
} from 'lucide-react';

function ManageDropdown({ lead, onExportCRM, onAddToSequence, onAddToList, onEditContact, onTagContact, onRemoveContact }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = (action, e) => {
    e.stopPropagation();
    setIsOpen(false);
    action();
  };

  const menuItems = [
    {
      icon: Upload,
      label: 'Export to CRM',
      action: onExportCRM,
    },
    {
      icon: ListPlus,
      label: 'Add to sequence',
      action: onAddToSequence,
    },
    {
      icon: ListPlus,
      label: 'Add to list',
      action: onAddToList,
    },
    {
      icon: Pencil,
      label: 'Edit contact',
      action: onEditContact,
    },
    {
      icon: Tag,
      label: 'Tag contact',
      action: onTagContact,
    },
    {
      icon: Trash2,
      label: 'Remove contact',
      action: onRemoveContact,
      danger: true,
    },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-800 hover:bg-dark-700 border border-dark-600 rounded-lg text-sm font-medium text-white transition-colors"
      >
        Manage
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 bg-dark-800 border border-dark-600 rounded-xl shadow-xl z-50 py-1 overflow-hidden">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={(e) => handleAction(item.action, e)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                item.danger
                  ? 'text-red-400 hover:bg-red-500/10'
                  : 'text-dark-200 hover:bg-dark-700'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ManageDropdown;

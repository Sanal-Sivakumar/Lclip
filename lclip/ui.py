import os
import sys
import json
import time
import hashlib
import subprocess
import unicodedata
from PyQt6.QtCore import Qt, QSize, pyqtSignal, QEvent, QTimer
from PyQt6.QtGui import QColor, QFont, QIcon, QKeySequence, QPixmap, QKeyEvent, QCursor
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QGridLayout, QScrollArea,
    QLineEdit, QLabel, QPushButton, QFrame, QStackedWidget,
    QGraphicsDropShadowEffect, QSizePolicy, QCheckBox, QApplication
)
from lclip.data import EMOJIS, KAOMOJIS, SYMBOLS

def log_ui(message):
    try:
        log_path = os.path.expanduser("~/.cache/lclip/ui.log")
        with open(log_path, "a") as f:
            f.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')} [{os.getpid()}] {message}\n")
    except Exception:
        pass



# Theme Constants
ACCENT_COLOR = "#3b8beb"      # Glyphr Blue Accent
ACCENT_HOVER = "#4a9aff"
BG_COLOR = "rgba(18, 6, 6, 0.62)" # Glassmorphic background
BORDER_COLOR = "rgba(255, 255, 255, 0.09)"
TEXT_COLOR = "rgba(255, 255, 255, 0.92)"
TEXT_MUTED = "rgba(255, 255, 255, 0.45)"
CARD_BG = "rgba(255, 255, 255, 0.04)"
CARD_BG_HOVER = "rgba(255, 255, 255, 0.08)"
CARD_BG_FOCUS = "rgba(255, 255, 255, 0.12)"

CACHE_DIR = os.path.expanduser("~/.cache/lclip")
HISTORY_FILE = os.path.join(CACHE_DIR, "history.json")
IMAGES_DIR = os.path.join(CACHE_DIR, "images")

class CustomScrollArea(QScrollArea):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWidgetResizable(True)
        self.setFrameShape(QFrame.Shape.NoFrame)
        self.setStyleSheet("""
            QScrollArea {
                background: transparent;
            }
            QScrollBar:vertical {
                border: none;
                background: transparent;
                width: 8px;
                margin: 0px;
            }
            QScrollBar::handle:vertical {
                background: rgba(255, 255, 255, 0.2);
                border-radius: 4px;
                min-height: 20px;
            }
            QScrollBar::handle:vertical:hover {
                background: rgba(255, 255, 255, 0.35);
            }
            QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {
                border: none;
                background: none;
            }
            QScrollBar:horizontal {
                height: 0px;
            }
        """)

class GridItemButton(QPushButton):
    def __init__(self, text, size_hint=None, parent=None):
        super().__init__(parent)
        self.setText(text)
        self.setFlat(True)
        if size_hint:
            self.setFixedSize(size_hint)
        self.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)
        self.setFocusPolicy(Qt.FocusPolicy.StrongFocus)
        self.setFont(QFont("Segoe UI Emoji", 15) if len(text) == 1 else QFont("Inter", 11))
        
        self.setStyleSheet(f"""
            QPushButton {{
                background-color: transparent;
                color: {TEXT_COLOR};
                border: 1px solid transparent;
                border-radius: 6px;
                padding: 4px;
            }}
            QPushButton:hover {{
                background-color: {CARD_BG_HOVER};
                border: 1px solid {BORDER_COLOR};
            }}
            QPushButton:focus {{
                background-color: {CARD_BG_FOCUS};
                border: 2px solid {TEXT_COLOR};
                outline: none;
            }}
        """)

class ClipboardCard(QFrame):
    selected_changed = pyqtSignal(bool, int)
    
    def __init__(self, item, index, ui_instance, parent=None):
        super().__init__(parent)
        self.item = item
        self.index = index
        self.ui = ui_instance
        self.is_checked = False
        
        self.setFocusPolicy(Qt.FocusPolicy.StrongFocus)
        self.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Preferred)
        self.setFrameShape(QFrame.Shape.StyledPanel)
        
        self.init_ui()
        self.update_style()
        
    def init_ui(self):
        layout = QHBoxLayout(self)
        layout.setContentsMargins(10, 8, 10, 8)
        layout.setSpacing(10)
        
        self.checkbox = QCheckBox(self)
        self.checkbox.setFocusPolicy(Qt.FocusPolicy.NoFocus)
        self.checkbox.setChecked(False)
        self.checkbox.stateChanged.connect(self.on_checkbox_changed)
        layout.addWidget(self.checkbox)
        
        if self.item["type"] == "text":
            self.content_label = QLabel(self.item["content"], self)
            self.content_label.setWordWrap(True)
            self.content_label.setStyleSheet(f"color: {TEXT_COLOR}; font-family: 'Inter'; font-size: 11pt;")
            self.content_label.setMaximumHeight(65)
            layout.addWidget(self.content_label, 1)
        else:
            self.content_label = QLabel(self)
            self.content_label.setFixedSize(80, 50)
            self.content_label.setStyleSheet("border-radius: 4px; background: rgba(0,0,0,0.2);")
            
            img_path = os.path.join(IMAGES_DIR, self.item["content"])
            if os.path.exists(img_path):
                pixmap = QPixmap(img_path)
                scaled_pixmap = pixmap.scaled(
                    self.content_label.size(),
                    Qt.AspectRatioMode.KeepAspectRatio,
                    Qt.TransformationMode.SmoothTransformation
                )
                self.content_label.setPixmap(scaled_pixmap)
                self.content_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
            else:
                self.content_label.setText("Image")
                self.content_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
            
            layout.addWidget(self.content_label, 0)
            
            desc_label = QLabel("Image File", self)
            desc_label.setStyleSheet(f"color: {TEXT_MUTED}; font-family: 'Inter'; font-size: 10pt;")
            layout.addWidget(desc_label, 1)
            
        self.btn_layout = QHBoxLayout()
        self.btn_layout.setSpacing(6)
        
        self.pin_btn = QPushButton(self)
        self.pin_btn.setFocusPolicy(Qt.FocusPolicy.NoFocus)
        self.pin_btn.setFixedSize(28, 28)
        self.update_pin_icon()
        self.pin_btn.clicked.connect(self.on_pin_clicked)
        self.btn_layout.addWidget(self.pin_btn)
        
        self.delete_btn = QPushButton("✕", self)
        self.delete_btn.setFocusPolicy(Qt.FocusPolicy.NoFocus)
        self.delete_btn.setFixedSize(28, 28)
        self.delete_btn.setStyleSheet(f"""
            QPushButton {{
                background: transparent;
                color: {TEXT_MUTED};
                border: none;
                border-radius: 4px;
                font-weight: bold;
            }}
            QPushButton:hover {{
                background: rgba(239, 68, 68, 0.2);
                color: #ef4444;
            }}
        """)
        self.delete_btn.clicked.connect(self.on_delete_clicked)
        self.btn_layout.addWidget(self.delete_btn)
        
        layout.addLayout(self.btn_layout)

    def update_pin_icon(self):
        is_pinned = self.item.get("pinned", False)
        pin_text = "📌" if is_pinned else "📍"
        self.pin_btn.setText(pin_text)
        self.pin_btn.setStyleSheet(f"""
            QPushButton {{
                background: {"rgba(0, 120, 212, 0.15)" if is_pinned else "transparent"};
                border: none;
                border-radius: 4px;
                font-size: 11pt;
            }}
            QPushButton:hover {{
                background: rgba(255, 255, 255, 0.1);
            }}
        """)

    def on_pin_clicked(self):
        self.ui.toggle_pin(self.index)
        
    def on_delete_clicked(self):
        self.ui.delete_item(self.index)
        
    def on_checkbox_changed(self, state):
        self.is_checked = (state == 2)
        self.selected_changed.emit(self.is_checked, self.index)
        self.update_style()

    def toggle_select(self):
        self.checkbox.setChecked(not self.checkbox.isChecked())

    def update_style(self):
        is_pinned = self.item.get("pinned", False)
        border_color = ACCENT_COLOR if is_pinned else BORDER_COLOR
        border_width = "2px" if self.hasFocus() or is_pinned else "1px"
        border = f"{border_width} solid {border_color}"
        if self.hasFocus():
            border = f"2px solid {TEXT_COLOR}"
            
        bg = CARD_BG_FOCUS if self.hasFocus() else (CARD_BG_HOVER if self.is_checked else CARD_BG)
        
        self.setStyleSheet(f"""
            ClipboardCard {{
                background-color: {bg};
                border: {border};
                border-radius: 10px;
            }}
            ClipboardCard:hover {{
                background-color: {CARD_BG_HOVER};
                border-color: rgba(255, 255, 255, 0.15);
            }}
        """)

    def focusInEvent(self, event):
        super().focusInEvent(event)
        self.update_style()
        
    def focusOutEvent(self, event):
        super().focusOutEvent(event)
        self.update_style()

    def keyPressEvent(self, event: QKeyEvent):
        if event.key() == Qt.Key.Key_Space:
            self.toggle_select()
            event.accept()
        elif event.key() == Qt.Key.Key_Delete:
            self.on_delete_clicked()
            event.accept()
        elif event.key() == Qt.Key.Key_P:
            self.on_pin_clicked()
            event.accept()
        elif event.key() in [Qt.Key.Key_Enter, Qt.Key.Key_Return]:
            if self.ui.selected_items:
                self.ui.paste_selected()
            else:
                self.ui.select_and_paste(self.index)
            event.accept()
        else:
            super().keyPressEvent(event)

class LclipWindow(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        log_ui("LclipWindow.__init__ start")
        self.selected_items = set()
        self.history = []
        self.load_history()
        
        self.has_been_active = False

        # Window settings
        self.setWindowFlags(
            Qt.WindowType.FramelessWindowHint |
            Qt.WindowType.Window
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground, True)
        self.setFixedSize(480, 580)
        
        self.init_ui()
        self.setup_nav_connections()
        
        # Focus loss handler
        QApplication.instance().focusChanged.connect(self.on_focus_changed)
        
        self.switch_tab(0)
        
        log_ui("LclipWindow.__init__ end")

    def showEvent(self, event):
        super().showEvent(event)
        QTimer.singleShot(500, self.set_active_true)
        
    def set_active_true(self):
        self.has_been_active = True

    def load_history(self):
        if os.path.exists(HISTORY_FILE):
            try:
                with open(HISTORY_FILE, "r") as f:
                    self.history = json.load(f)
            except Exception:
                self.history = []
        else:
            self.history = []

    def save_history(self):
        try:
            with open(HISTORY_FILE, "w") as f:
                json.dump(self.history, f, indent=2)
        except Exception as e:
            print(f"Error saving history: {e}", file=sys.stderr)

    def add_to_history(self, content_type, content):
        self.load_history()
        existing_idx = -1
        pinned = False
        for i, item in enumerate(self.history):
            if item.get("type") == content_type and item.get("content") == content:
                existing_idx = i
                pinned = item.get("pinned", False)
                break
        if existing_idx != -1:
            self.history.pop(existing_idx)
            
        new_item = {
            "type": content_type,
            "content": content,
            "pinned": pinned,
            "timestamp": time.time()
        }
        self.history.insert(0, new_item)
        
        # Trim history
        max_items = 80
        pinned_items = [item for item in self.history if item.get("pinned", False)]
        unpinned_items = [item for item in self.history if not item.get("pinned", False)]
        allowed_unpinned = max_items - len(pinned_items)
        if allowed_unpinned < 0:
            allowed_unpinned = 0
            
        trimmed_unpinned = unpinned_items[allowed_unpinned:]
        for item in trimmed_unpinned:
            if item.get("type") == "image":
                img_path = os.path.join(IMAGES_DIR, item.get("content"))
                if os.path.exists(img_path):
                    try:
                        os.remove(img_path)
                    except OSError:
                        pass
        self.history = pinned_items + unpinned_items[:allowed_unpinned]
        self.history.sort(key=lambda x: (1 if x.get("pinned", False) else 0, x.get("timestamp", 0)), reverse=True)
        self.save_history()

    def toggle_pin(self, index):
        self.load_history()
        if 0 <= index < len(self.history):
            self.history[index]["pinned"] = not self.history[index]["pinned"]
            self.history.sort(key=lambda x: (1 if x.get("pinned", False) else 0, x.get("timestamp", 0)), reverse=True)
            self.save_history()
            self.update_history_list()

    def delete_item(self, index):
        self.load_history()
        if 0 <= index < len(self.history):
            item = self.history.pop(index)
            if item.get("type") == "image":
                img_path = os.path.join(IMAGES_DIR, item.get("content"))
                if os.path.exists(img_path):
                    try:
                        os.remove(img_path)
                    except OSError:
                        pass
            self.save_history()
            self.update_history_list()

    def clear_history(self):
        self.load_history()
        pinned_items = []
        for item in self.history:
            if item.get("pinned", False):
                pinned_items.append(item)
            elif item.get("type") == "image":
                img_path = os.path.join(IMAGES_DIR, item.get("content"))
                if os.path.exists(img_path):
                    try:
                        os.remove(img_path)
                    except OSError:
                        pass
        self.history = pinned_items
        self.save_history()
        self.update_history_list()

    def init_ui(self):
        outer_layout = QVBoxLayout(self)
        outer_layout.setContentsMargins(10, 10, 10, 10)
        
        self.main_frame = QFrame(self)
        self.main_frame.setObjectName("MainFrame")
        self.main_frame.setStyleSheet(f"""
            QFrame#MainFrame {{
                background-color: {BG_COLOR};
                border: 1px solid {BORDER_COLOR};
                border-radius: 12px;
            }}
        """)
        
        shadow = QGraphicsDropShadowEffect(self)
        shadow.setBlurRadius(20)
        shadow.setColor(QColor(0, 0, 0, 120))
        shadow.setOffset(0, 4)
        self.main_frame.setGraphicsEffect(shadow)
        
        layout = QVBoxLayout(self.main_frame)
        layout.setContentsMargins(16, 16, 16, 16)
        layout.setSpacing(12)
        
        header = QHBoxLayout()
        title = QLabel("Glyphr", self)
        title.setStyleSheet(f"color: {TEXT_COLOR}; font-family: 'Inter'; font-size: 14pt; font-weight: bold;")
        header.addWidget(title)
        header.addStretch()
        
        close_btn = QPushButton("✕", self)
        close_btn.setFixedSize(28, 28)
        close_btn.setFocusPolicy(Qt.FocusPolicy.NoFocus)
        close_btn.setStyleSheet(f"""
            QPushButton {{
                background: transparent;
                color: {TEXT_MUTED};
                border: none;
                border-radius: 14px;
                font-weight: bold;
                font-size: 11pt;
            }}
            QPushButton:hover {{
                background: rgba(255, 255, 255, 0.1);
                color: {TEXT_COLOR};
            }}
        """)
        close_btn.clicked.connect(self.close_and_exit)
        header.addWidget(close_btn)
        layout.addLayout(header)
        
        self.tab_bar = QHBoxLayout()
        self.tab_bar.setSpacing(4)
        
        self.tab_buttons = []
        tabs_info = [
            ("📋 Clipboard", 0),
            ("😊 Emojis", 1),
            ("٩(^‿^)۶ Kaomoji", 2),
            ("½ Symbols", 3)
        ]
        
        for name, idx in tabs_info:
            btn = QPushButton(name, self)
            btn.setFocusPolicy(Qt.FocusPolicy.StrongFocus)
            btn.setFixedHeight(34)
            btn.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Fixed)
            btn.clicked.connect(lambda checked, i=idx: self.switch_tab(i))
            self.tab_bar.addWidget(btn)
            self.tab_buttons.append(btn)
            
        layout.addLayout(self.tab_bar)
        
        self.search_input = QLineEdit(self)
        self.search_input.setPlaceholderText("Search emojis, kaomojis, symbols, or history...")
        self.search_input.setFocusPolicy(Qt.FocusPolicy.StrongFocus)
        self.search_input.setFixedHeight(38)
        self.search_input.setStyleSheet(f"""
            QLineEdit {{
                background-color: rgba(0, 0, 0, 0.25);
                color: {TEXT_COLOR};
                border: 1px solid {BORDER_COLOR};
                border-radius: 8px;
                padding-left: 12px;
                padding-right: 12px;
                font-family: 'Inter';
                font-size: 11pt;
            }}
            QLineEdit:focus {{
                border: 2px solid {ACCENT_COLOR};
                background-color: rgba(0, 0, 0, 0.35);
            }}
        """)
        self.search_input.textChanged.connect(self.on_search_changed)
        layout.addWidget(self.search_input)
        
        self.content_stack = QStackedWidget(self)
        self.content_stack.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)
        
        self.history_scroll = CustomScrollArea(self)
        self.history_container = QWidget()
        self.history_layout = QVBoxLayout(self.history_container)
        self.history_layout.setContentsMargins(0, 0, 8, 0)
        self.history_layout.setSpacing(8)
        self.history_layout.addStretch()
        self.history_scroll.setWidget(self.history_container)
        self.content_stack.addWidget(self.history_scroll)
        
        self.emoji_scroll = CustomScrollArea(self)
        self.emoji_container = QWidget()
        self.emoji_layout = QVBoxLayout(self.emoji_container)
        self.emoji_layout.setContentsMargins(0, 0, 8, 0)
        self.emoji_scroll.setWidget(self.emoji_container)
        self.content_stack.addWidget(self.emoji_scroll)
        
        self.kaomoji_scroll = CustomScrollArea(self)
        self.kaomoji_container = QWidget()
        self.kaomoji_layout = QVBoxLayout(self.kaomoji_container)
        self.kaomoji_layout.setContentsMargins(0, 0, 8, 0)
        self.kaomoji_scroll.setWidget(self.kaomoji_container)
        self.content_stack.addWidget(self.kaomoji_scroll)
        
        self.symbol_scroll = CustomScrollArea(self)
        self.symbol_container = QWidget()
        self.symbol_layout = QVBoxLayout(self.symbol_container)
        self.symbol_layout.setContentsMargins(0, 0, 8, 0)
        self.symbol_scroll.setWidget(self.symbol_container)
        self.content_stack.addWidget(self.symbol_scroll)
        
        layout.addWidget(self.content_stack)
        
        self.multi_bar = QFrame(self)
        self.multi_bar.setStyleSheet(f"""
            QFrame {{
                background-color: {ACCENT_COLOR};
                border-radius: 8px;
            }}
            QLabel {{
                color: white;
                font-family: 'Inter';
                font-weight: bold;
                font-size: 10pt;
            }}
            QPushButton {{
                background-color: white;
                color: {ACCENT_COLOR};
                border: none;
                border-radius: 4px;
                font-weight: bold;
                padding: 4px 12px;
            }}
            QPushButton:hover {{
                background-color: rgba(255,255,255,0.9);
            }}
        """)
        multi_layout = QHBoxLayout(self.multi_bar)
        multi_layout.setContentsMargins(10, 6, 10, 6)
        
        self.multi_label = QLabel("0 items selected", self)
        multi_layout.addWidget(self.multi_label)
        
        multi_layout.addStretch()
        
        paste_btn = QPushButton("Paste Combined (Enter)", self)
        paste_btn.setFocusPolicy(Qt.FocusPolicy.NoFocus)
        paste_btn.clicked.connect(self.paste_selected)
        multi_layout.addWidget(paste_btn)
        
        layout.addWidget(self.multi_bar)
        self.multi_bar.hide()
        
        self.tip_label = QLabel("Tab: Navigate | Enter: Paste | Esc: Close", self)
        self.tip_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.tip_label.setStyleSheet(f"color: {TEXT_MUTED}; font-family: 'Inter'; font-size: 9pt;")
        layout.addWidget(self.tip_label)
        
        outer_layout.addWidget(self.main_frame)
        
        self.init_emoji_grid()
        self.init_kaomoji_grid()
        self.init_symbol_grid()

    def update_tab_styles(self, active_idx):
        for idx, btn in enumerate(self.tab_buttons):
            is_active = (idx == active_idx)
            border_bottom = f"2px solid {ACCENT_COLOR}" if is_active else "2px solid transparent"
            color = TEXT_COLOR if is_active else TEXT_MUTED
            weight = "bold" if is_active else "normal"
            
            btn.setStyleSheet(f"""
                QPushButton {{
                    background: transparent;
                    color: {color};
                    border: none;
                    border-bottom: {border_bottom};
                    font-family: 'Inter';
                    font-size: 10pt;
                    font-weight: {weight};
                    padding-bottom: 6px;
                }}
                QPushButton:hover {{
                    color: {TEXT_COLOR};
                    background: rgba(255,255,255,0.04);
                }}
                QPushButton:focus {{
                    outline: none;
                    background: rgba(255,255,255,0.08);
                }}
            """)

    def switch_tab(self, index):
        self.content_stack.setCurrentIndex(index)
        self.update_tab_styles(index)
        self.search_input.clear()
        self.search_input.setFocus()
        self.selected_items.clear()
        self.update_multi_bar()
        if index == 0:
            self.update_history_list()

    def setup_nav_connections(self):
        self.installEventFilter(self)

    def eventFilter(self, obj, event):
        if event.type() == QEvent.Type.KeyPress:
            key_event = QKeyEvent(event)
            key = key_event.key()
            
            if key == Qt.Key.Key_Escape:
                self.close_and_exit()
                return True
                
            if key == Qt.Key.Key_Tab and (key_event.modifiers() & Qt.KeyboardModifier.ControlModifier):
                next_idx = (self.content_stack.currentIndex() + 1) % 4
                self.switch_tab(next_idx)
                return True
            if key == Qt.Key.Key_Backtab and (key_event.modifiers() & Qt.KeyboardModifier.ControlModifier):
                prev_idx = (self.content_stack.currentIndex() - 1) % 4
                self.switch_tab(prev_idx)
                return True
                
            if obj == self.search_input and key == Qt.Key.Key_Down:
                self.focus_first_content_item()
                return True
                
            if key in [Qt.Key.Key_Up, Qt.Key.Key_Down, Qt.Key.Key_Left, Qt.Key.Key_Right]:
                active_idx = self.content_stack.currentIndex()
                focused_widget = self.focusWidget()
                
                if focused_widget and focused_widget != self.search_input and not isinstance(focused_widget, QPushButton) and focused_widget.parent() and focused_widget.parent().parent() == self.tab_bar:
                    pass
                else:
                    if active_idx == 0:
                        cards = self.history_container.findChildren(ClipboardCard)
                        if focused_widget in cards:
                            curr_idx = cards.index(focused_widget)
                            if key == Qt.Key.Key_Down and curr_idx < len(cards) - 1:
                                cards[curr_idx + 1].setFocus()
                                return True
                            elif key == Qt.Key.Key_Up:
                                if curr_idx > 0:
                                    cards[curr_idx - 1].setFocus()
                                else:
                                    self.search_input.setFocus()
                                return True
                    else:
                        grid_buttons = self.get_visible_grid_buttons()
                        if focused_widget in grid_buttons:
                            curr_idx = grid_buttons.index(focused_widget)
                            cols = 8 if active_idx in [1, 3] else 3
                            
                            if key == Qt.Key.Key_Right and curr_idx < len(grid_buttons) - 1:
                                grid_buttons[curr_idx + 1].setFocus()
                                return True
                            elif key == Qt.Key.Key_Left and curr_idx > 0:
                                grid_buttons[curr_idx - 1].setFocus()
                                return True
                            elif key == Qt.Key.Key_Down and curr_idx + cols < len(grid_buttons):
                                grid_buttons[curr_idx + cols].setFocus()
                                return True
                            elif key == Qt.Key.Key_Up:
                                if curr_idx - cols >= 0:
                                    grid_buttons[curr_idx - cols].setFocus()
                                else:
                                    self.search_input.setFocus()
                                return True
                                
        return super().eventFilter(obj, event)

    def get_visible_grid_buttons(self):
        active_idx = self.content_stack.currentIndex()
        if active_idx == 1:
            container = self.emoji_container
        elif active_idx == 2:
            container = self.kaomoji_container
        elif active_idx == 3:
            container = self.symbol_container
        else:
            return []
            
        buttons = container.findChildren(GridItemButton)
        return [b for b in buttons if b.isVisible()]

    def focus_first_content_item(self):
        active_idx = self.content_stack.currentIndex()
        if active_idx == 0:
            cards = self.history_container.findChildren(ClipboardCard)
            if cards:
                cards[0].setFocus()
        else:
            buttons = self.get_visible_grid_buttons()
            if buttons:
                buttons[0].setFocus()

    def init_emoji_grid(self):
        self.clear_layout(self.emoji_layout)
        for cat, list_emojis in EMOJIS.items():
            cat_label = QLabel(cat, self)
            cat_label.setStyleSheet(f"color: {TEXT_MUTED}; font-family: 'Inter'; font-weight: bold; font-size: 11pt; margin-top: 10px; margin-bottom: 4px;")
            self.emoji_layout.addWidget(cat_label)
            
            grid_widget = QWidget()
            grid = QGridLayout(grid_widget)
            grid.setContentsMargins(0, 0, 0, 0)
            grid.setSpacing(6)
            
            for idx, emoji in enumerate(list_emojis):
                btn = GridItemButton(emoji, QSize(42, 42), self)
                btn.clicked.connect(lambda checked, text=emoji: self.copy_and_exit(text))
                grid.addWidget(btn, idx // 8, idx % 8)
                
            self.emoji_layout.addWidget(grid_widget)
        self.emoji_layout.addStretch()

    def init_kaomoji_grid(self):
        self.clear_layout(self.kaomoji_layout)
        for cat, list_kaomojis in KAOMOJIS.items():
            cat_label = QLabel(cat, self)
            cat_label.setStyleSheet(f"color: {TEXT_MUTED}; font-family: 'Inter'; font-weight: bold; font-size: 11pt; margin-top: 10px; margin-bottom: 4px;")
            self.kaomoji_layout.addWidget(cat_label)
            
            grid_widget = QWidget()
            grid = QGridLayout(grid_widget)
            grid.setContentsMargins(0, 0, 0, 0)
            grid.setSpacing(6)
            
            for idx, kaomoji in enumerate(list_kaomojis):
                btn = GridItemButton(kaomoji, QSize(125, 42), self)
                btn.clicked.connect(lambda checked, text=kaomoji: self.copy_and_exit(text))
                grid.addWidget(btn, idx // 3, idx % 3)
                
            self.kaomoji_layout.addWidget(grid_widget)
        self.kaomoji_layout.addStretch()

    def init_symbol_grid(self):
        self.clear_layout(self.symbol_layout)
        for cat, list_symbols in SYMBOLS.items():
            cat_label = QLabel(cat, self)
            cat_label.setStyleSheet(f"color: {TEXT_MUTED}; font-family: 'Inter'; font-weight: bold; font-size: 11pt; margin-top: 10px; margin-bottom: 4px;")
            self.symbol_layout.addWidget(cat_label)
            
            grid_widget = QWidget()
            grid = QGridLayout(grid_widget)
            grid.setContentsMargins(0, 0, 0, 0)
            grid.setSpacing(6)
            
            for idx, symbol in enumerate(list_symbols):
                btn = GridItemButton(symbol, QSize(42, 42), self)
                btn.clicked.connect(lambda checked, text=symbol: self.copy_and_exit(text))
                grid.addWidget(btn, idx // 8, idx % 8)
                
            self.symbol_layout.addWidget(grid_widget)
        self.symbol_layout.addStretch()

    def update_history_list(self):
        self.clear_layout(self.history_layout)
        self.selected_items.clear()
        self.update_multi_bar()
        
        if not self.history:
            empty_label = QLabel("Clipboard history is empty.", self)
            empty_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
            empty_label.setStyleSheet(f"color: {TEXT_MUTED}; font-family: 'Inter'; font-size: 11pt; margin-top: 40px;")
            self.history_layout.addWidget(empty_label)
        else:
            clear_all_row = QHBoxLayout()
            clear_all_row.addStretch()
            clear_btn = QPushButton("Clear all", self)
            clear_btn.setFocusPolicy(Qt.FocusPolicy.NoFocus)
            clear_btn.setStyleSheet(f"""
                QPushButton {{
                    background: transparent;
                    color: {TEXT_MUTED};
                    border: 1px solid {BORDER_COLOR};
                    border-radius: 4px;
                    padding: 4px 10px;
                    font-family: 'Inter';
                    font-size: 9pt;
                }}
                QPushButton:hover {{
                    background: rgba(255, 255, 255, 0.08);
                    color: {TEXT_COLOR};
                }}
            """)
            clear_btn.clicked.connect(self.clear_history)
            clear_all_row.addWidget(clear_btn)
            self.history_layout.addLayout(clear_all_row)

            for idx, item in enumerate(self.history):
                card = ClipboardCard(item, idx, self)
                card.selected_changed.connect(self.on_card_selected_changed)
                self.history_layout.addWidget(card)
                
        self.history_layout.addStretch()

    def on_card_selected_changed(self, checked, index):
        if checked:
            self.selected_items.add(index)
        else:
            self.selected_items.discard(index)
        self.update_multi_bar()

    def update_multi_bar(self):
        count = len(self.selected_items)
        if count > 0:
            self.multi_label.setText(f"{count} items selected")
            self.multi_bar.show()
        else:
            self.multi_bar.hide()

    def select_and_paste(self, index):
        self.load_history()
        if 0 <= index < len(self.history):
            item = self.history[index]
            if item["type"] == "text":
                self.copy_and_exit(item["content"])
            else:
                self.copy_image_and_exit(item["content"])

    def paste_selected(self):
        if not self.selected_items:
            return
            
        self.load_history()
        sorted_indices = sorted(list(self.selected_items))
        
        combined_texts = []
        for idx in sorted_indices:
            item = self.history[idx]
            if item["type"] == "text":
                combined_texts.append(item["content"])
                
        if combined_texts:
            combined_string = "\n".join(combined_texts)
            self.copy_and_exit(combined_string)

    def copy_and_exit(self, text):
        self.add_to_history("text", text)
        clipboard = QApplication.clipboard()
        clipboard.setText(text)
        
        # Trigger independent background paste subprocess
        subprocess.Popen(
            ["sh", "-c", "sleep 0.15 && xdotool key ctrl+v"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        self.close_and_exit()

    def copy_image_and_exit(self, filename):
        self.add_to_history("image", filename)
        img_path = os.path.join(IMAGES_DIR, filename)
        if os.path.exists(img_path):
            pixmap = QPixmap(img_path)
            clipboard = QApplication.clipboard()
            clipboard.setImage(pixmap.toImage())
            
            subprocess.Popen(
                ["sh", "-c", "sleep 0.15 && xdotool key ctrl+v"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
        self.close_and_exit()

    def on_search_changed(self, query):
        query = query.strip().lower()
        active_idx = self.content_stack.currentIndex()
        
        if active_idx == 0:
            cards = self.history_container.findChildren(ClipboardCard)
            for card in cards:
                if card.item["type"] == "text":
                    match = query in card.item["content"].lower()
                else:
                    match = query in "image file"
                card.setVisible(match or not query)
                
        elif active_idx == 1:
            self.filter_buttons(self.emoji_container, query, is_emoji=True)
        elif active_idx == 2:
            self.filter_buttons(self.kaomoji_container, query, is_emoji=False)
        elif active_idx == 3:
            self.filter_buttons(self.symbol_container, query, is_emoji=True)

    def filter_buttons(self, container, query, is_emoji):
        buttons = container.findChildren(GridItemButton)
        for btn in buttons:
            text = btn.text()
            match = False
            if query:
                if query in text.lower():
                    match = True
                elif is_emoji:
                    try:
                        char_name = unicodedata.name(text[0]).lower()
                        if query in char_name:
                            match = True
                    except Exception:
                        pass
            else:
                match = True
            btn.setVisible(match)
            
        layout = container.layout()
        if layout:
            for i in range(layout.count()):
                item = layout.itemAt(i)
                widget = item.widget()
                if isinstance(widget, QLabel) and i + 1 < layout.count():
                    grid_widget = layout.itemAt(i + 1).widget()
                    if grid_widget:
                        grid_btns = grid_widget.findChildren(GridItemButton)
                        any_visible = any(b.isVisible() for b in grid_btns)
                        widget.setVisible(any_visible)
                        grid_widget.setVisible(any_visible)

    def clear_layout(self, layout):
        if layout is None:
            return
        while layout.count():
            item = layout.takeAt(0)
            widget = item.widget()
            if widget is not None:
                widget.deleteLater()
            else:
                self.clear_layout(item.layout())

    def on_focus_changed(self, old, now):
        log_ui(f"on_focus_changed: old={old}, now={now}")
        if now is None:
            QTimer.singleShot(150, self.check_should_hide)

    def changeEvent(self, event):
        if event.type() == QEvent.Type.ActivationChange:
            log_ui(f"changeEvent: ActivationChange, isActive={self.isActiveWindow()}")
            if self.isActiveWindow():
                self.has_been_active = True
            elif self.has_been_active:
                QTimer.singleShot(150, self.check_should_hide)
        super().changeEvent(event)

    def check_should_hide(self):
        focus_widget = QApplication.focusWidget()
        log_ui(f"check_should_hide: has_been_active={self.has_been_active}, visible={self.isVisible()}, active={self.isActiveWindow()}, focus={focus_widget}")
        if not self.isVisible():
            return
        if (not self.isActiveWindow() or focus_widget is None) and self.has_been_active:
            log_ui("check_should_hide: triggering close_and_exit")
            self.close_and_exit()

    def close_and_exit(self):
        log_ui("close_and_exit: cleaning lock and exiting process")
        self.close()
        try:
            lock_path = os.path.expanduser("~/.cache/lclip/lclip-ui.lock")
            if os.path.exists(lock_path):
                os.remove(lock_path)
        except OSError:
            pass
        sys.exit(0)

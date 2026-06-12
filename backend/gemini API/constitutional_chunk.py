"""
Constitutional Chunk Data Structure

This module defines the ConstitutionalChunk dataclass for representing
structured segments of UUD 1945 (Indonesian Constitution) with complete
metadata for parsing, retrieval, and citation.

Requirements: 5.2, 5.3
"""

from dataclasses import dataclass
from typing import Optional, List
import re


@dataclass
class ConstitutionalChunk:
    """
    Structured representation of constitutional text with hierarchical metadata.
    
    This dataclass captures a segment of UUD 1945 text along with its structural
    position (Bab/Pasal/Ayat) and processing metadata for efficient retrieval
    and accurate citation.
    
    Attributes:
        content: The actual constitutional text content
        bab_number: Chapter number (Roman numeral converted to int)
        bab_title: Chapter title/heading
        pasal_number: Article number (Arabic numeral)
        ayat_number: Verse/paragraph number within a Pasal
        chunk_id: Unique identifier for this chunk
        chunk_length: Character length of content
        source_file: Original PDF filename
        page_number: Page number in source PDF
        embedding: Optional vector embedding for semantic search
    
    Examples:
        >>> chunk = ConstitutionalChunk(
        ...     content="Negara Indonesia adalah Negara Kesatuan...",
        ...     bab_number=1,
        ...     bab_title="BENTUK DAN KEDAULATAN",
        ...     pasal_number=1,
        ...     ayat_number=1,
        ...     chunk_id=1,
        ...     source_file="UUD1945.pdf"
        ... )
        >>> chunk.to_reference()
        'Bab 1 Pasal 1 ayat (1)'
    """
    
    # Content
    content: str
    
    # Structural metadata (hierarchical position in UUD 1945)
    bab_number: Optional[int] = None
    bab_title: Optional[str] = None
    pasal_number: Optional[int] = None
    ayat_number: Optional[int] = None
    
    # Processing metadata
    chunk_id: int = 0
    chunk_length: int = 0
    source_file: str = ""
    page_number: Optional[int] = None
    
    # Embedding for vector search
    embedding: Optional[list[float]] = None
    
    def __post_init__(self):
        """Calculate chunk_length automatically after initialization."""
        if self.chunk_length == 0:
            self.chunk_length = len(self.content)
    
    def __eq__(self, other) -> bool:
        """
        Equality comparison for round-trip property testing.
        
        Two chunks are considered equal if they have the same content
        and structural metadata (bab, pasal, ayat numbers). Processing
        metadata like chunk_id and embeddings are ignored for equality.
        
        Args:
            other: Another object to compare with
            
        Returns:
            True if both chunks have identical content and structure
            
        Examples:
            >>> chunk1 = ConstitutionalChunk(content="Test", pasal_number=1)
            >>> chunk2 = ConstitutionalChunk(content="Test", pasal_number=1, chunk_id=999)
            >>> chunk1 == chunk2
            True
        """
        if not isinstance(other, ConstitutionalChunk):
            return False
        return (
            self.content == other.content and
            self.bab_number == other.bab_number and
            self.pasal_number == other.pasal_number and
            self.ayat_number == other.ayat_number
        )
    
    def to_reference(self) -> str:
        """
        Generate human-readable citation reference.
        
        Formats the structural metadata into a standard Indonesian legal
        citation format following UUD 1945 conventions.
        
        Returns:
            Formatted reference string (e.g., "Bab 1 Pasal 1 ayat (1)")
            or "Unknown" if no structural metadata is available
            
        Examples:
            >>> chunk = ConstitutionalChunk(content="Test", bab_number=1, pasal_number=1)
            >>> chunk.to_reference()
            'Bab 1 Pasal 1'
            
            >>> chunk = ConstitutionalChunk(content="Test", pasal_number=5, ayat_number=2)
            >>> chunk.to_reference()
            'Pasal 5 ayat (2)'
            
            >>> chunk = ConstitutionalChunk(content="Test")
            >>> chunk.to_reference()
            'Unknown'
        """
        parts = []
        
        if self.bab_number is not None:
            parts.append(f"Bab {self.bab_number}")
            if self.bab_title:
                parts.append(f'"{self.bab_title}"')
        
        if self.pasal_number is not None:
            parts.append(f"Pasal {self.pasal_number}")
        
        if self.ayat_number is not None:
            parts.append(f"ayat ({self.ayat_number})")
        
        return " ".join(parts) if parts else "Unknown"
    
    def __repr__(self) -> str:
        """
        String representation for debugging.
        
        Returns:
            Detailed string showing content preview and reference
        """
        content_preview = self.content[:50] + "..." if len(self.content) > 50 else self.content
        return f"ConstitutionalChunk({self.to_reference()}: {content_preview!r})"
    
    def to_dict(self) -> dict:
        """
        Convert chunk to dictionary for JSON serialization.
        
        Useful for API responses and database storage.
        
        Returns:
            Dictionary representation of the chunk
        """
        return {
            "content": self.content,
            "bab_number": self.bab_number,
            "bab_title": self.bab_title,
            "pasal_number": self.pasal_number,
            "ayat_number": self.ayat_number,
            "chunk_id": self.chunk_id,
            "chunk_length": self.chunk_length,
            "source_file": self.source_file,
            "page_number": self.page_number,
            "reference": self.to_reference()
        }


def int_to_roman(num: int) -> str:
    """
    Convert an integer to Roman numeral representation.
    
    Args:
        num: Integer to convert (1-3999)
        
    Returns:
        Roman numeral string
        
    Examples:
        >>> int_to_roman(1)
        'I'
        >>> int_to_roman(4)
        'IV'
        >>> int_to_roman(16)
        'XVI'
    """
    val = [
        1000, 900, 500, 400,
        100, 90, 50, 40,
        10, 9, 5, 4,
        1
    ]
    syms = [
        "M", "CM", "D", "CD",
        "C", "XC", "L", "XL",
        "X", "IX", "V", "IV",
        "I"
    ]
    roman_num = ''
    i = 0
    while num > 0:
        for _ in range(num // val[i]):
            roman_num += syms[i]
            num -= val[i]
        i += 1
    return roman_num


def roman_to_int(roman: str) -> int:
    """
    Convert a Roman numeral string to an integer.
    
    Args:
        roman: Roman numeral string (e.g., "I", "IV", "XVI")
        
    Returns:
        Integer value of the Roman numeral
        
    Examples:
        >>> roman_to_int("I")
        1
        >>> roman_to_int("IV")
        4
        >>> roman_to_int("XVI")
        16
    """
    roman_values = {
        'I': 1, 'V': 5, 'X': 10, 'L': 50,
        'C': 100, 'D': 500, 'M': 1000
    }
    
    total = 0
    prev_value = 0
    
    for char in reversed(roman.upper()):
        value = roman_values.get(char, 0)
        if value < prev_value:
            total -= value
        else:
            total += value
        prev_value = value
    
    return total


def parse_constitutional_text(text: str, source_file: str = "UUD1945.pdf") -> List[ConstitutionalChunk]:
    """
    Parse UUD 1945 text with awareness of Bab/Pasal/Ayat structure.
    
    Uses regex patterns to detect and extract:
    - BAB markers with Roman numerals (e.g., "BAB I")
    - Bab titles (uppercase text following BAB marker)
    - Pasal markers with Arabic numerals (e.g., "Pasal 1")
    - Ayat markers with parenthesized numbers (e.g., "(1)")
    
    The parser maintains hierarchical metadata, associating each chunk with its
    parent Bab and Pasal context. It returns a list of ConstitutionalChunk objects
    preserving the document structure.
    
    Args:
        text: Raw text from UUD 1945 document
        source_file: Source PDF filename for metadata
        
    Returns:
        List of ConstitutionalChunk objects with complete structural metadata
        
    Examples:
        >>> text = '''BAB I
        ... BENTUK DAN KEDAULATAN
        ... Pasal 1
        ... (1) Negara Indonesia adalah Negara Kesatuan.
        ... (2) Kedaulatan berada di tangan rakyat.'''
        >>> chunks = parse_constitutional_text(text)
        >>> len(chunks)
        2
        >>> chunks[0].bab_number
        1
        >>> chunks[0].pasal_number
        1
        >>> chunks[0].ayat_number
        1
        
    Requirements: 5.1, 5.2, 5.3, 6.1, 6.2
    """
    chunks = []
    chunk_id_counter = 1
    
    # Current context (hierarchical state)
    current_bab_number = None
    current_bab_title = None
    current_pasal_number = None
    
    # Regex patterns for UUD 1945 structure
    bab_pattern = re.compile(r'^BAB\s+([IVXLCDM]+)\s*$', re.MULTILINE | re.IGNORECASE)
    pasal_pattern = re.compile(r'^Pasal\s+(\d+)\s*$', re.MULTILINE)
    ayat_pattern = re.compile(r'^\((\d+)\)\s*(.+?)(?=\n\(|\n\nPasal|\n\nBAB|$)', re.MULTILINE | re.DOTALL)
    
    # Split text by lines for processing
    lines = text.split('\n')
    i = 0
    
    while i < len(lines):
        line = lines[i].strip()
        
        # Check for BAB marker
        bab_match = bab_pattern.match(line)
        if bab_match:
            roman_numeral = bab_match.group(1)
            current_bab_number = roman_to_int(roman_numeral)
            
            # Next line should be the Bab title (uppercase)
            if i + 1 < len(lines):
                potential_title = lines[i + 1].strip()
                # Bab titles are typically uppercase and not BAB/Pasal markers
                if potential_title and not bab_pattern.match(potential_title) and not pasal_pattern.match(potential_title):
                    current_bab_title = potential_title
                    i += 1  # Skip the title line
            i += 1
            continue
        
        # Check for Pasal marker
        pasal_match = pasal_pattern.match(line)
        if pasal_match:
            current_pasal_number = int(pasal_match.group(1))
            i += 1
            continue
        
        # Check for Ayat marker
        ayat_match = re.match(r'^\((\d+)\)\s*(.+)', line)
        if ayat_match and current_pasal_number is not None:
            ayat_number = int(ayat_match.group(1))
            content_parts = [ayat_match.group(2)]
            
            # Collect continuation lines for this ayat
            j = i + 1
            while j < len(lines):
                next_line = lines[j].strip()
                # Stop if we hit another structural marker
                if (bab_pattern.match(next_line) or 
                    pasal_pattern.match(next_line) or 
                    re.match(r'^\(\d+\)', next_line)):
                    break
                if next_line:  # Add non-empty lines
                    content_parts.append(next_line)
                j += 1
            
            content = ' '.join(content_parts).strip()
            
            # Create chunk
            chunk = ConstitutionalChunk(
                content=content,
                bab_number=current_bab_number,
                bab_title=current_bab_title,
                pasal_number=current_pasal_number,
                ayat_number=ayat_number,
                chunk_id=chunk_id_counter,
                source_file=source_file
            )
            chunks.append(chunk)
            chunk_id_counter += 1
            
            i = j  # Move to the line after the ayat content
            continue
        
        i += 1
    
    return chunks


def pretty_print(chunk: ConstitutionalChunk) -> str:
    """
    Format a ConstitutionalChunk object back into readable UUD 1945 text format.
    
    Preserves the original formatting conventions of UUD 1945 including:
    - Bab headers with Roman numerals in uppercase (e.g., "BAB I")
    - Bab titles in uppercase below the header
    - Pasal numbering with Arabic numerals (e.g., "Pasal 1")
    - Ayat with parenthesized numbers and proper indentation (e.g., "(1)Content")
    
    Args:
        chunk: ConstitutionalChunk object to format
        
    Returns:
        Formatted text string following UUD 1945 conventions
        
    Examples:
        >>> chunk = ConstitutionalChunk(
        ...     content="Negara Indonesia ialah Negara Kesatuan...",
        ...     bab_number=1,
        ...     bab_title="BENTUK DAN KEDAULATAN",
        ...     pasal_number=1,
        ...     ayat_number=1
        ... )
        >>> print(pretty_print(chunk))
        BAB I
        BENTUK DAN KEDAULATAN
        Pasal 1
        (1)Negara Indonesia ialah Negara Kesatuan...
    
    Requirements: 6.4, 6.6
    """
    lines = []
    
    # Format Bab header with Roman numeral
    if chunk.bab_number is not None:
        roman_numeral = int_to_roman(chunk.bab_number)
        lines.append(f"BAB {roman_numeral}")
        
        # Format Bab title in uppercase
        if chunk.bab_title:
            lines.append(chunk.bab_title.upper())
    
    # Format Pasal numbering
    if chunk.pasal_number is not None:
        lines.append(f"Pasal {chunk.pasal_number}")
    
    # Format Ayat with indentation
    if chunk.ayat_number is not None:
        # Ayat format: (number)content
        lines.append(f"({chunk.ayat_number}){chunk.content}")
    else:
        # If no ayat number, just append the content
        lines.append(chunk.content)
    
    return "\n".join(lines)
